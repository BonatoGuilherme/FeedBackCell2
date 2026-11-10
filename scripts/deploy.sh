#!/usr/bin/env bash
# Deploy do FeedBackCELL num servidor Linux com Docker, com HTTPS (Let's Encrypt)
# no próprio nginx. Rode na raiz do projeto, no servidor:
#
#   DOMAIN=feedbackcell.com.br LETSENCRYPT_EMAIL=voce@exemplo.com ./scripts/deploy.sh
#
# Primeira vez: cria o .env a partir do .env.example com segredos aleatórios,
# emite o certificado e sobe tudo. Nas próximas: atualiza o código (git pull),
# reconstrói e sobe de novo, mantendo o .env e os dados.
#
# Pré-requisitos: Docker com o plugin compose, git, openssl, curl, portas 80 e
# 443 liberadas no firewall e o DNS do domínio apontando para este servidor.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.https.yml)

info() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31mErro:\033[0m %s\n' "$*" >&2; exit 1; }

# valor de uma variável no .env (vazio se não existir)
ler_env() { sed -n "s/^$1=//p" .env | tail -n 1 | sed 's/^"\(.*\)"$/\1/'; }

# define (ou troca) uma variável no .env
gravar_env() {
  local chave=$1 valor=$2
  if grep -q "^$chave=" .env; then
    local tmp; tmp=$(mktemp)
    awk -v k="$chave" -v v="$valor" 'BEGIN{FS=OFS="="} $1==k{print k "=" v; next} {print}' .env > "$tmp"
    cat "$tmp" > .env && rm -f "$tmp"
  else
    printf '%s=%s\n' "$chave" "$valor" >> .env
  fi
}

segredo() { openssl rand -hex 48 | cut -c1-"$1"; }

# ---------------------------------------------------------------- verificações
for cmd in docker git openssl curl; do
  command -v "$cmd" >/dev/null || erro "'$cmd' não encontrado. Instale antes de continuar."
done
docker compose version >/dev/null 2>&1 || erro "plugin 'docker compose' não encontrado."

# --------------------------------------------------------------------- código
if [ -d .git ] && [ -z "${FBC_CODIGO_ATUALIZADO:-}" ]; then
  info "Atualizando o código (master)"
  git fetch --quiet
  git checkout --quiet master
  git pull --ff-only --quiet
  # roda de novo a versão recém-baixada deste script
  FBC_CODIGO_ATUALIZADO=1 exec "$0" "$@"
fi

# ----------------------------------------------------------------------- .env
if [ ! -f .env ]; then
  [ -f .env.example ] || erro ".env.example não encontrado."
  info "Criando .env com segredos aleatórios"
  cp .env.example .env
  # o MySQL do compose só cria o root (senha = DB_PASSWORD)
  gravar_env DB_USER root
  gravar_env DB_NAME feedbackcell
  gravar_env DB_PASSWORD "$(segredo 40)"
  gravar_env JWT_SECRET "$(segredo 64)"
  # exemplos do .env.example não podem virar domínio de verdade
  gravar_env DOMAIN ""
  gravar_env LETSENCRYPT_EMAIL ""
fi
chmod 600 .env

DOMAIN=${DOMAIN:-$(ler_env DOMAIN)}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-$(ler_env LETSENCRYPT_EMAIL)}
[ -n "$DOMAIN" ] || erro "defina DOMAIN (ex.: DOMAIN=feedbackcell.com.br ./scripts/deploy.sh)."
[ -n "$LETSENCRYPT_EMAIL" ] || erro "defina LETSENCRYPT_EMAIL (avisos de vencimento do certificado)."
gravar_env DOMAIN "$DOMAIN"
gravar_env LETSENCRYPT_EMAIL "$LETSENCRYPT_EMAIL"
# o core-api recusa requisições de origens fora do CORS_ORIGIN
gravar_env CORS_ORIGIN "https://$DOMAIN"

for chave in DB_USER DB_PASSWORD DB_NAME JWT_SECRET; do
  [ -n "$(ler_env "$chave")" ] || erro "$chave está vazio no .env."
done
[ "$(ler_env JWT_SECRET | wc -c)" -gt 32 ] || erro "JWT_SECRET precisa de pelo menos 32 caracteres."
[ -n "$(ler_env MOBILEAPI_KEY)" ] || info "Aviso: MOBILEAPI_KEY vazio; a busca automática de especificações fica desligada."

"${COMPOSE[@]}" config --quiet || erro "configuração do Docker Compose inválida."

# ---------------------------------------------------------------- certificado
if ! "${COMPOSE[@]}" run --rm --entrypoint sh certbot -c "test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
  info "Emitindo o certificado de $DOMAIN (porta 80 precisa estar livre)"
  "${COMPOSE[@]}" stop proxy 2>/dev/null || true
  "${COMPOSE[@]}" run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone \
    -d "$DOMAIN" --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email --non-interactive
fi

# --------------------------------------------------------------------- subida
info "Construindo e subindo os serviços (a primeira vez demora)"
"${COMPOSE[@]}" up -d --build --remove-orphans

info "Esperando o proxy ficar saudável"
for _ in $(seq 1 60); do
  estado=$("${COMPOSE[@]}" ps --format '{{.Health}}' proxy 2>/dev/null || true)
  [ "$estado" = "healthy" ] && break
  sleep 5
done
[ "${estado:-}" = "healthy" ] || { "${COMPOSE[@]}" ps; erro "o proxy não ficou saudável; veja 'docker compose logs'."; }

# ---------------------------------------------------------------- verificação
info "Verificando https://$DOMAIN"
curl -fsS "https://$DOMAIN/health" >/dev/null || erro "/health não respondeu."
curl -fsS "https://$DOMAIN/readyz" >/dev/null || erro "/readyz falhou (banco ou Redis)."
curl -fsS -o /dev/null "https://$DOMAIN/" || erro "o frontend não respondeu."

"${COMPOSE[@]}" ps
info "Deploy concluído: https://$DOMAIN"
