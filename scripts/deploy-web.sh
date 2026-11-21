#!/usr/bin/env bash
# Builds the web app and publishes it to the S3 bucket behind CloudFront.
# Needs a valid SSO session: aws sso login --profile cloudbox
set -euo pipefail

cd "$(dirname "$0")/.."
PROFILE="${AWS_PROFILE:-cloudbox}"

# The bucket and distribution come from Terraform's outputs (local state).
BUCKET="$(terraform -chdir=infra output -raw web_bucket_name)"
DIST_ID="$(terraform -chdir=infra output -raw cloudfront_distribution_id)"
SITE_URL="$(terraform -chdir=infra output -raw site_url)"

echo "==> Building the web app"
pnpm --filter web build

DIST_DIR="apps/web/dist"

# Upload order matters: assets first, index.html last, so a visitor never gets an
# index.html that points to files that are not in the bucket yet.

echo "==> Uploading hashed assets (cached for a year: the file name changes when the content does)"
aws s3 sync "$DIST_DIR/assets" "s3://$BUCKET/assets" --delete \
  --cache-control "public,max-age=31536000,immutable" --profile "$PROFILE"

echo "==> Uploading other static files (short cache: file names are not hashed)"
aws s3 sync "$DIST_DIR" "s3://$BUCKET" --delete \
  --exclude "assets/*" --exclude "index.html" \
  --cache-control "public,max-age=3600" --profile "$PROFILE"

echo "==> Uploading index.html (always revalidated)"
aws s3 cp "$DIST_DIR/index.html" "s3://$BUCKET/index.html" \
  --cache-control "no-cache" --content-type "text/html; charset=utf-8" --profile "$PROFILE"

echo "==> Invalidating index.html in CloudFront"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/index.html" \
  --profile "$PROFILE" --query 'Invalidation.Status' --output text

echo "Done: $SITE_URL"
