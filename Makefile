.PHONY: install dev build typecheck test verify clean deploy deploy-minor deploy-major

install:
	bun install

dev:
	bun run dev

dev-pg:
	bun run dev:pg

build:
	bun run build

typecheck:
	bun run typecheck

test:
	bun test

# Full verification: typecheck + test + build
verify: typecheck test build

clean:
	rm -rf src/web/dist node_modules/.cache

# Deploy: make deploy | make deploy-minor | make deploy-major | make deploy V=2.0.0
deploy:
	./deploy.sh $(V)

deploy-minor:
	./deploy.sh minor

deploy-major:
	./deploy.sh major

# Smoke tests (require Docker services)
smoke:
	bun scripts/smoke-tests/pg-migration-test.ts
	bun scripts/smoke-tests/pg-smoke-test.ts

smoke-embeddings:
	bun scripts/smoke-tests/embedding-smoke-test.ts
	bun scripts/smoke-tests/semantic-search-smoke-test.ts

smoke-all: smoke smoke-embeddings
