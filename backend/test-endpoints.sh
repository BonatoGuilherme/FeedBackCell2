#!/bin/bash

# FEEDBACKCELL - Test Script para endpoints
# Este script testa todos os endpoints da API

BASE_URL="http://localhost:5000/api"
TOKEN=""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para fazer requests e exibir resultado
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth=$4
    
    echo -e "${YELLOW}[TEST] $method $endpoint${NC}"
    
    if [ "$auth" = "true" ] && [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ Token não definido. Faça login primeiro.${NC}\n"
        return
    fi
    
    if [ "$auth" = "true" ]; then
        curl -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$data" \
            -w "\nStatus: %{http_code}\n\n"
    else
        curl -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\nStatus: %{http_code}\n\n"
    fi
}

echo -e "${GREEN}
╔════════════════════════════════════════════╗
║   FeedBackCELL API - Test Suite           ║
║   Base URL: $BASE_URL      ║
╚════════════════════════════════════════════╝${NC}\n"

# ============================================
# 1. AUTENTICAÇÃO
# ============================================
echo -e "${YELLOW}=== TESTE 1: AUTENTICAÇÃO ===${NC}\n"

# Register
echo -e "${YELLOW}1.1 - Registrar novo usuário${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "nome": "João Teste",
        "email": "joao@test.com",
        "senha": "senha123"
    }')
echo $REGISTER_RESPONSE | jq .
echo ""

# Login
echo -e "${YELLOW}1.2 - Fazer login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "joao@test.com",
        "senha": "senha123"
    }')
echo $LOGIN_RESPONSE | jq .
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')
echo -e "${GREEN}Token obtido: ${TOKEN:0:20}...${NC}\n"

# ============================================
# 2. CELULARES - PUBLIC
# ============================================
echo -e "${YELLOW}=== TESTE 2: CELULARES (Públicos) ===${NC}\n"

echo -e "${YELLOW}2.1 - Listar celulares${NC}"
curl -s -X GET "$BASE_URL/celulares?page=1&limit=10" \
    -H "Content-Type: application/json" | jq .
echo ""

# ============================================
# 3. CELULARES - PROTEGIDO
# ============================================
echo -e "${YELLOW}=== TESTE 3: CELULARES (Protegido) ===${NC}\n"

if [ ! -z "$TOKEN" ]; then
    echo -e "${YELLOW}3.1 - Criar novo celular${NC}"
    CELULAR_RESPONSE=$(curl -s -X POST "$BASE_URL/celulares" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "marca": "Samsung",
            "modelo": "Galaxy S23",
            "preco": 3999.99,
            "descricao": "Excelente celular com câmera 50MP"
        }')
    echo $CELULAR_RESPONSE | jq .
    CELULAR_ID=$(echo $CELULAR_RESPONSE | jq -r '.celular.idcelular // empty')
    echo -e "${GREEN}Celular criado com ID: $CELULAR_ID${NC}\n"
    
    echo -e "${YELLOW}3.2 - Buscar meus celulares${NC}"
    curl -s -X GET "$BASE_URL/celulares/meus-itens" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" | jq .
    echo ""
    
    # ============================================
    # 4. COMENTÁRIOS
    # ============================================
    if [ ! -z "$CELULAR_ID" ]; then
        echo -e "${YELLOW}=== TESTE 4: COMENTÁRIOS ===${NC}\n"
        
        echo -e "${YELLOW}4.1 - Criar comentário${NC}"
        COMENTARIO_RESPONSE=$(curl -s -X POST "$BASE_URL/celulares/$CELULAR_ID/comentarios" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d '{
                "texto": "Excelente celular! Recomendo muito!"
            }')
        echo $COMENTARIO_RESPONSE | jq .
        COMENTARIO_ID=$(echo $COMENTARIO_RESPONSE | jq -r '.comentario.idcomentario // empty')
        echo ""
        
        echo -e "${YELLOW}4.2 - Listar comentários${NC}"
        curl -s -X GET "$BASE_URL/celulares/$CELULAR_ID/comentarios?page=1&limit=10" \
            -H "Content-Type: application/json" | jq .
        echo ""
    fi
    
    # ============================================
    # 5. USUÁRIOS
    # ============================================
    echo -e "${YELLOW}=== TESTE 5: USUÁRIOS ===${NC}\n"
    
    echo -e "${YELLOW}5.1 - Ver perfil${NC}"
    curl -s -X GET "$BASE_URL/usuarios/perfil" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" | jq .
    echo ""
    
    echo -e "${YELLOW}5.2 - Atualizar perfil${NC}"
    curl -s -X PUT "$BASE_URL/usuarios/perfil" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "nome": "João Silva Atualizado",
            "email": "joao.silva@test.com"
        }' | jq .
    echo ""
    
else
    echo -e "${RED}❌ Falha ao obter token. Skipping protected tests.${NC}\n"
fi

echo -e "${GREEN}✅ Testes concluídos!${NC}"
