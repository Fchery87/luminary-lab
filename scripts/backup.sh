#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"

echo "=== Luminary Lab Backup Script ==="
echo "Started at: $(date)"
echo "Backup directory: $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

backup_database() {
    echo "Backing up database..."
    local db_backup="$BACKUP_DIR/database_${DATE}.sql.gz"
    
    if [ -n "$DATABASE_URL" ]; then
        pg_dump "$DATABASE_URL" | gzip > "$db_backup"
        echo "Database backup saved to: $db_backup"
    else
        echo "DATABASE_URL not set, skipping database backup"
    fi
}

backup_redis() {
    echo "Backing up Redis..."
    local redis_backup="$BACKUP_DIR/redis_${DATE}.rdb"
    
    if [ -n "$REDIS_URL" ]; then
        redis-cli -u "$REDIS_URL" SAVE
        redis-cli -u "$REDIS_URL" --rdb "$redis_backup"
        echo "Redis backup saved to: $redis_backup"
    else
        echo "REDIS_URL not set, skipping Redis backup"
    fi
}

backup_env() {
    echo "Backing up environment configuration..."
    local env_backup="$BACKUP_DIR/env_${DATE}.tar.gz"
    
    if [ -f "$SCRIPT_DIR/.env" ]; then
        tar -czf "$env_backup" -C "$SCRIPT_DIR" .env
        echo "Environment backup saved to: $env_backup"
    fi
}

upload_to_s3() {
    local file="$1"
    local bucket="${S3_BACKUP_BUCKET:-}"
    
    if [ -n "$bucket" ] && [ -f "$file" ]; then
        echo "Uploading $file to S3..."
        aws s3 cp "$file" "s3://$bucket/backups/$(basename "$file")"
        echo "Uploaded to S3"
    fi
}

cleanup_old_backups() {
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
    echo "Cleanup complete"
}

backup_database
backup_redis
backup_env

if [ -n "$S3_BACKUP_BUCKET" ]; then
    for backup_file in "$BACKUP_DIR"/*_${DATE}.*; do
        if [ -f "$backup_file" ]; then
            upload_to_s3 "$backup_file"
        fi
    done
fi

cleanup_old_backups

echo "=== Backup completed at: $(date) ==="
