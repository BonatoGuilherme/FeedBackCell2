#!/bin/sh
set -eu

: "${DB_HOST:?DB_HOST is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${MYSQL_PWD:?MYSQL_PWD is required}"

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

case "$BACKUP_INTERVAL_SECONDS" in
  ''|*[!0-9]*) echo "BACKUP_INTERVAL_SECONDS must be a positive integer" >&2; exit 1 ;;
esac
case "$BACKUP_RETENTION_DAYS" in
  ''|*[!0-9]*) echo "BACKUP_RETENTION_DAYS must be a positive integer" >&2; exit 1 ;;
esac
if [ "$BACKUP_INTERVAL_SECONDS" -lt 60 ] || [ "$BACKUP_RETENTION_DAYS" -lt 1 ]; then
  echo "Backup interval must be at least 60 seconds and retention at least 1 day" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

while :; do
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  sql_file="$BACKUP_DIR/.feedbackcell_${timestamp}_$$.sql"
  archive_tmp="$BACKUP_DIR/.feedbackcell_${timestamp}_$$.sql.gz.tmp"
  archive="$BACKUP_DIR/feedbackcell_${timestamp}_$$.sql.gz"

  cleanup() {
    rm -f "$sql_file" "$archive_tmp"
  }
  trap cleanup EXIT
  trap 'cleanup; exit 1' HUP INT TERM

  echo "Criando backup do banco ${DB_NAME}..."
  mysqldump \
    --host="$DB_HOST" \
    --port="${DB_PORT:-3306}" \
    --user="$DB_USER" \
    --single-transaction \
    --routines \
    --triggers \
    --databases "$DB_NAME" > "$sql_file"
  gzip -c "$sql_file" > "$archive_tmp"
  gzip -t "$archive_tmp"
  mv "$archive_tmp" "$archive"
  rm -f "$sql_file"
  find "$BACKUP_DIR" -type f -name "feedbackcell_*.sql.gz" \
    -mtime "+$BACKUP_RETENTION_DAYS" -delete
  trap - EXIT HUP INT TERM
  echo "Backup verificado: $archive"
  sleep "$BACKUP_INTERVAL_SECONDS"
done
