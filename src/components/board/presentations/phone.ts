import { keyObjectMedia, type KeyObject } from "@/components/board/presentations/key-object";
import { placed } from "@/components/board/presentations/stage";
import type { PresentationProject, PresentationSpec, PresentationTile } from "@/components/board/presentations/types";

const PHONE_CLOSED = { width: 453, height: 551 };
const PHONE_OPEN = { width: 1532, height: 862 };
const PHONE_SCREEN = { width: 390, height: 852 };
const PHONE_ASPECT = PHONE_SCREEN.width / PHONE_SCREEN.height;
const PHONE_TILE = { width: 275, height: 275 * (PHONE_SCREEN.height / PHONE_SCREEN.width) };
const PHONE_ORIGIN = { left: 29, top: 46 };
const PHONE_GAP = { x: 25, y: 20 };
const PHONE_CLOSED_TILE = { left: 90, top: 111 };
const PHONE_COLUMNS = 5;
const PHONE_KEY_ID = "orientation-1";

type PhoneScreen = {
  id: string;
  src: string;
  label: string;
  description: string;
};

const PHONE_SCREENS: PhoneScreen[] = [
  {
    id: "splash",
    src: "/media/card/chia-signer/splash.png",
    label: "Splash",
    description: "The Signer mark, before the first screen.",
  },
  {
    id: "orientation-1",
    src: "/media/card/chia-signer/orientation-1.png",
    label: "Welcome",
    description: "A key that stays on this device, for signing transactions.",
  },
  {
    id: "orientation-3",
    src: "/media/card/chia-signer/orientation-3.png",
    label: "Chia Vault",
    description: "Add this device as a signer on Vault transactions.",
  },
  {
    id: "home-screen",
    src: "/media/card/chia-signer/home-screen.png",
    label: "Home Screen",
    description: "Signer on the iPhone home screen.",
  },
  {
    id: "name-key",
    src: "/media/card/chia-signer/name-key.png",
    label: "Name Your Key",
    description: "A nickname stored on this device. Only you can see it.",
  },
  {
    id: "choose-color",
    src: "/media/card/chia-signer/choose-color.png",
    label: "Choose a Color",
    description: "A color for the key. It can be changed later.",
  },
  {
    id: "display-image",
    src: "/media/card/chia-signer/display-image.png",
    label: "Set a Display Image",
    description: "An image for this key. Only you can see it.",
  },
  {
    id: "permissions",
    src: "/media/card/chia-signer/permissions.png",
    label: "Enable Permissions",
    description: "Notifications for spend bundles, and the camera for QR codes.",
  },
  {
    id: "key-type",
    src: "/media/card/chia-signer/key-type.png",
    label: "Choose a Key Type",
    description: "A hardware key in Secure Enclave, or a software key.",
  },
  {
    id: "accept-terms",
    src: "/media/card/chia-signer/accept-terms.png",
    label: "Accept Terms",
    description: "The agreement, before it can be accepted.",
  },
  {
    id: "accept-terms-agreed",
    src: "/media/card/chia-signer/accept-terms-agreed.png",
    label: "Terms Accepted",
    description: "The agreement, ready to continue.",
  },
  {
    id: "generating-key",
    src: "/media/card/chia-signer/generating-key.png",
    label: "Generating Key",
    description: "The key is created on this device.",
  },
  {
    id: "key-ready",
    src: "/media/card/chia-signer/key-ready.png",
    label: "Key Ready",
    description: "A new hardware key, shown with its color.",
  },
  {
    id: "key-ready-image",
    src: "/media/card/chia-signer/key-ready-image.png",
    label: "Key Ready",
    description: "The same key, with a display image.",
  },
  {
    id: "backup",
    src: "/media/card/chia-signer/backup.png",
    label: "Back It Up",
    description: "An iCloud backup, in case this device is lost.",
  },
  {
    id: "import-key",
    src: "/media/card/chia-signer/import-key.png",
    label: "Import a Key",
    description: "An existing key, entered as a 24-word phrase.",
  },
  {
    id: "keys",
    src: "/media/card/chia-signer/keys.png",
    label: "Keys",
    description: "Every key on this device.",
  },
  {
    id: "keys-initials",
    src: "/media/card/chia-signer/keys-initials.png",
    label: "Keys",
    description: "Keys shown with an initial instead of an image.",
  },
  {
    id: "keys-selected",
    src: "/media/card/chia-signer/keys-selected.png",
    label: "Keys",
    description: "A second mark on keys that can sign.",
  },
  {
    id: "key-transactions",
    src: "/media/card/chia-signer/key-transactions.png",
    label: "Latest Transactions",
    description: "Spends waiting on this key, and who else must sign.",
  },
  {
    id: "transaction-detail",
    src: "/media/card/chia-signer/transaction-detail.png",
    label: "Transaction",
    description: "Where the coins move, and why.",
  },
  {
    id: "transaction-signature",
    src: "/media/card/chia-signer/transaction-signature.png",
    label: "Signature",
    description: "The signed transaction, as a code to hand back to Vault.",
  },
  {
    id: "transaction-signed",
    src: "/media/card/chia-signer/transaction-signed.png",
    label: "Transaction Signed",
    description: "Scan, copy, or send the signature to finish in Vault.",
  },
  {
    id: "public-key",
    src: "/media/card/chia-signer/public-key.png",
    label: "Public Key",
    description: "This key’s public key, on the card for the key.",
  },
  {
    id: "scan-camera",
    src: "/media/card/chia-signer/scan-camera.png",
    label: "Scan a Code",
    description: "Camera access, so a Vault code can be read.",
  },
  {
    id: "scan-found",
    src: "/media/card/chia-signer/scan-found.png",
    label: "Code Found",
    description: "A transaction code, locked in the frame.",
  },
  {
    id: "scan-progress",
    src: "/media/card/chia-signer/scan-progress.png",
    label: "1 of 3 Codes",
    description: "The first of three codes for this transaction.",
  },
  {
    id: "scan-close",
    src: "/media/card/chia-signer/scan-close.png",
    label: "Code in Frame",
    description: "The code fills the scanner.",
  },
  {
    id: "scan-alert",
    src: "/media/card/chia-signer/scan-alert.png",
    label: "Scan Alert",
    description: "A message over the scanner.",
  },
  {
    id: "scan-with-key",
    src: "/media/card/chia-signer/scan-with-key.png",
    label: "Signing with This Key",
    description: "The code, and the key that will sign it.",
  },
  {
    id: "scan-with-key-sheet",
    src: "/media/card/chia-signer/scan-with-key-sheet.png",
    label: "Choose a Key",
    description: "The key sheet, still coming up over the scanner.",
  },
  {
    id: "settings",
    src: "/media/card/chia-signer/settings.png",
    label: "Settings",
    description: "Icons, security, connections, and the rest of the app.",
  },
  {
    id: "key-settings",
    src: "/media/card/chia-signer/key-settings.png",
    label: "Key Settings",
    description: "Backup, public key, notifications, and options for one key.",
  },
  {
    id: "face-id",
    src: "/media/card/chia-signer/face-id.png",
    label: "Face ID",
    description: "Confirm it is you before the signature is made.",
  },
  {
    id: "review-signature",
    src: "/media/card/chia-signer/review-signature.png",
    label: "Review",
    description: "Check the transaction identifier, then take the signature.",
  },
];

export const PHONE_PROJECT: PresentationProject = {
  title: "Transaction Signer",
  chips: ["2023", "UI/UX", "Chia"],
};

export type PhoneScreenInput = {
  id: string;
  label: string;
  description: string;
  object: KeyObject;
};

function toPhoneScreenInput(screen: PhoneScreen | PhoneScreenInput): PhoneScreenInput {
  if ("object" in screen) {
    return screen;
  }

  return {
    id: screen.id,
    label: screen.label,
    description: screen.description,
    object: { type: "image", src: screen.src },
  };
}

export function phoneTiles(
  screens: readonly (PhoneScreen | PhoneScreenInput)[] = PHONE_SCREENS,
  keyId = PHONE_KEY_ID,
): PresentationTile[] {
  const inputs = screens.map(toPhoneScreenInput);
  const key = inputs.find((screen) => screen.id === keyId) ?? inputs[0];
  const rest = inputs.filter((screen) => screen.id !== key?.id);
  const rows = Math.ceil(inputs.length / PHONE_COLUMNS);
  const tiles: PresentationTile[] = [];
  let restIndex = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < PHONE_COLUMNS; col += 1) {
      const primary = col === 2 && row === 0;
      const screen = primary ? key : rest[restIndex];
      if (!screen) {
        continue;
      }
      if (!primary) {
        restIndex += 1;
      }

      const x = PHONE_ORIGIN.left + col * (PHONE_TILE.width + PHONE_GAP.x);
      const y = PHONE_ORIGIN.top + row * (PHONE_TILE.height + PHONE_GAP.y);

      tiles.push({
        id: `p-${col}-${row}`,
        x,
        y,
        width: PHONE_TILE.width,
        height: PHONE_TILE.height,
        radius: 32,
        resting: primary,
        ring: Math.max(Math.abs(col - 2), row),
        shiftX: primary ? PHONE_CLOSED_TILE.left - x : 0,
        shiftY: primary ? PHONE_CLOSED_TILE.top - y : 0,
        media: keyObjectMedia(screen.object),
        aspect: PHONE_ASPECT,
        label: screen.label,
        description: screen.description,
      });
    }
  }

  return tiles;
}

export function phonePresentation(
  project: PresentationProject = PHONE_PROJECT,
  screens?: readonly PhoneScreenInput[],
): PresentationSpec {
  return {
    id: "phone",
    label: "iOS",
    openLabel: "Expand the card",
    project,
    closed: placed(PHONE_CLOSED),
    open: placed(PHONE_OPEN),
    tiles: phoneTiles(screens),
  };
}
