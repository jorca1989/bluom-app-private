// This file is a fallback. Platform-specific files take precedence:
//   OutdoorActivityModal.native.tsx  — loaded on iOS/Android (lazy-loads GPS screen)
//   OutdoorActivityModal.web.tsx     — loaded on web (returns null, no native deps)
// This file is only reached in edge cases (e.g. Jest test environment).
type Props = { visible: boolean; onClose: () => void };
export default function OutdoorActivityModal(_props: Props) {
  return null;
}
