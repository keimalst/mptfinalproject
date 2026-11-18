#!/usr/bin/env bash
# Menjalankan migrasi + uji pada Postgres lokal (butuh psql & server Postgres berjalan).
# Pemakaian:  PGURL=postgres://postgres@localhost:5432/postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
URL="${PGURL:-postgres://postgres@localhost:5432/centra_test}"
DB="${URL##*/}"; ROOT="${URL%/*}"
psql "$ROOT/postgres" -qc "drop database if exists $DB" -c "create database $DB"
psql "$URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/00_stubs.sql
for f in supabase/migrations/*.sql; do echo "-> $f"; psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
psql "$URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql 2>&1 | grep -E "OK|GAGAL|LULUS|ERROR"
