#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
APP_NAME="ResonaDesk"
APP_VERSION="1.0.0"
BUNDLE_ID="com.appstudio.resonadesk"
RESONA_CARGO_TARGET_DIR="${RESONA_CARGO_TARGET_DIR:-/tmp/cargo_target_resona}"
DISTRIBUTION_BUILD="${DISTRIBUTION_BUILD:-1}"
SIGNING_IDENTITY="${SIGNING_IDENTITY:-}"
NOTARY_PROFILE="${NOTARY_PROFILE:-}"

if [[ "$DISTRIBUTION_BUILD" != "0" && "$DISTRIBUTION_BUILD" != "1" ]]; then
  echo "DISTRIBUTION_BUILD must be 0 or 1" >&2
  exit 2
fi

if [[ -z "$SIGNING_IDENTITY" ]]; then
  SIGNING_IDENTITY="$(security find-identity -v -p codesigning 2>/dev/null \
    | awk -F'"' '/Developer ID Application/ { print $2; exit }')"
fi

if [[ "$DISTRIBUTION_BUILD" == "1" ]]; then
  if [[ -z "$SIGNING_IDENTITY" ]]; then
    echo "A valid Developer ID Application certificate is required for cloud distribution." >&2
    exit 3
  fi
  if [[ -z "$NOTARY_PROFILE" ]]; then
    echo "NOTARY_PROFILE must name a notarytool keychain profile for cloud distribution." >&2
    exit 4
  fi
fi

RESONA_BUILD_ROOT="$(mktemp -d /tmp/resona_tauri_bundle.XXXXXX)"
cleanup() {
  rm -rf "$RESONA_BUILD_ROOT"
  if [[ -n "${FINAL_DMG_TEMP:-}" ]]; then
    rm -f "$FINAL_DMG_TEMP"
  fi
}
trap cleanup EXIT

APP_BUNDLE="$RESONA_BUILD_ROOT/${APP_NAME}.app"
CONTENTS_DIR="$APP_BUNDLE/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
DMG_STAGE="$RESONA_BUILD_ROOT/dmg_stage"
DMG_OUT_DIR="$PROJECT_DIR/dist_dmg"

if [[ "$DISTRIBUTION_BUILD" == "1" ]]; then
  DMG_NAME="${APP_NAME}-Tauri-macOS-arm64-v${APP_VERSION}.dmg"
else
  DMG_NAME="${APP_NAME}-Tauri-macOS-arm64-v${APP_VERSION}-local-test.dmg"
fi

LOCAL_DMG_PATH="$RESONA_BUILD_ROOT/$DMG_NAME"
FINAL_DMG_PATH="$DMG_OUT_DIR/$DMG_NAME"
FINAL_DMG_TEMP="$DMG_OUT_DIR/.${DMG_NAME}.tmp.$$"

cd "$PROJECT_DIR"

echo ">> [1/7] Building and type-checking the production frontend..."
npm run build

echo ">> [2/7] Compiling the Tauri release binary with custom protocol assets..."
(
  cd "$PROJECT_DIR/src-tauri"
  CARGO_TARGET_DIR="$RESONA_CARGO_TARGET_DIR" \
    CARGO_INCREMENTAL=0 \
    cargo build --locked --release --features custom-protocol
)

echo ">> [3/7] Assembling the zero-config macOS application bundle..."
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR/bin/models" "$DMG_OUT_DIR"
install -m 755 "$RESONA_CARGO_TARGET_DIR/release/resona-desk" "$MACOS_DIR/$APP_NAME"
install -m 644 "$PROJECT_DIR/src-tauri/icons/icon.icns" "$RESOURCES_DIR/icon.icns"
install -m 755 "$PROJECT_DIR/bin/ffmpeg" "$RESOURCES_DIR/bin/ffmpeg"
install -m 755 "$PROJECT_DIR/bin/whisper-cli" "$RESOURCES_DIR/bin/whisper-cli"
install -m 644 "$PROJECT_DIR/bin/models/ggml-base.bin" "$RESOURCES_DIR/bin/models/ggml-base.bin"
install -m 644 "$PROJECT_DIR/bin/models/ggml-small.bin" "$RESOURCES_DIR/bin/models/ggml-small.bin"
install -m 644 "$PROJECT_DIR/NOTICE.md" "$RESOURCES_DIR/NOTICE.md"

cat > "$CONTENTS_DIR/Info.plist" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundleDisplayName</key>
    <string>ResonaDesk 声纹工作台</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleVersion</key>
    <string>$APP_VERSION</string>
    <key>CFBundleShortVersionString</key>
    <string>$APP_VERSION</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>$APP_NAME</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.productivity</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>
PLIST_EOF

plutil -lint "$CONTENTS_DIR/Info.plist"
xattr -cr "$APP_BUNDLE"

echo ">> [4/7] Verifying architecture, embedded frontend, resources, and dynamic links..."
file "$MACOS_DIR/$APP_NAME" | grep -q 'arm64'
file "$RESOURCES_DIR/bin/ffmpeg" | grep -q 'arm64'
file "$RESOURCES_DIR/bin/whisper-cli" | grep -q 'arm64'
if find "$APP_BUNDLE" -type f -name '*.downloading' | grep -q .; then
  echo "Partial model downloads must not ship in the application bundle." >&2
  exit 5
fi
otool -L "$MACOS_DIR/$APP_NAME"

echo ">> [5/7] Signing the application bundle..."
if [[ "$DISTRIBUTION_BUILD" == "1" ]]; then
  codesign --force --options runtime --timestamp --sign "$SIGNING_IDENTITY" "$RESOURCES_DIR/bin/ffmpeg"
  codesign --force --options runtime --timestamp --sign "$SIGNING_IDENTITY" "$RESOURCES_DIR/bin/whisper-cli"
  codesign --force --options runtime --timestamp --sign "$SIGNING_IDENTITY" "$APP_BUNDLE"
else
  echo "WARNING: creating an ad-hoc signed local validation build; it is not cloud-distribution ready."
  codesign --force --sign - "$RESOURCES_DIR/bin/ffmpeg"
  codesign --force --sign - "$RESOURCES_DIR/bin/whisper-cli"
  codesign --force --sign - "$APP_BUNDLE"
fi
codesign --verify --deep --strict --verbose=4 "$APP_BUNDLE"

echo ">> [6/7] Creating the compressed DMG..."
mkdir -p "$DMG_STAGE"
ditto "$APP_BUNDLE" "$DMG_STAGE/$APP_NAME.app"
ln -s /Applications "$DMG_STAGE/Applications"
hdiutil create \
  -volname "$APP_NAME Installer" \
  -srcfolder "$DMG_STAGE" \
  -format UDZO \
  -ov \
  "$LOCAL_DMG_PATH"
hdiutil verify "$LOCAL_DMG_PATH"

echo ">> [7/7] Completing distribution verification..."
if [[ "$DISTRIBUTION_BUILD" == "1" ]]; then
  codesign --force --timestamp --sign "$SIGNING_IDENTITY" "$LOCAL_DMG_PATH"
  codesign --verify --strict --verbose=4 "$LOCAL_DMG_PATH"
  xcrun notarytool submit "$LOCAL_DMG_PATH" --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$LOCAL_DMG_PATH"
  xcrun stapler validate "$LOCAL_DMG_PATH"
  spctl --assess --type execute --verbose=4 "$APP_BUNDLE"
  spctl --assess --type open --context context:primary-signature --verbose=4 "$LOCAL_DMG_PATH"
fi

cp -X "$LOCAL_DMG_PATH" "$FINAL_DMG_TEMP"
mv -f "$FINAL_DMG_TEMP" "$FINAL_DMG_PATH"
chmod 644 "$FINAL_DMG_PATH"

DMG_SIZE_MB="$(du -m "$FINAL_DMG_PATH" | cut -f1)"
echo "DMG_PATH=$FINAL_DMG_PATH"
echo "DMG_SIZE_MB=$DMG_SIZE_MB"
if [[ "$DISTRIBUTION_BUILD" == "1" ]]; then
  echo "DISTRIBUTION_STATUS=signed-notarized-stapled"
else
  echo "DISTRIBUTION_STATUS=local-validation-only"
fi
