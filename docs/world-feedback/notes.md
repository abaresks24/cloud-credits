# World Selfie Check — integration notes (feedback deliverable)

Notes taken while integrating World Selfie Check into Cloud Credits (SPEC §5.4). To be finished once a
World App ID is provisioned.

## Intent
Selfie Check as an **anti-fraud, not KYC** signal: a cloud commitment is sold by a company, but a real
human must authorize the sale. A valid proof gates the desk action (issue ENS subname + write records
+ mint the commitment token). Tested on the **World ID Sandbox** (fictional users, no real biometrics).

## Where it plugs in
- Frontend: `frontend/components/Onboard.tsx` — the "Sell / Onboard" screen. The IDKit widget is gated
  behind `NEXT_PUBLIC_WORLD_APP_ID` so the rest of the app runs without it. On a valid proof the flow
  calls a server route that verifies the proof and triggers the desk onboarding.
- On-chain: onboarding writes `commitment.*` to `CommitmentResolver` and binds the address in
  `EnsEligibilityAdapter` (see the working path in `frontend/components/Desk.tsx`).

## Status / blocker
- **Needs a World App ID** (Developer Portal → create app → enable Selfie Check → Sandbox). Set
  `NEXT_PUBLIC_WORLD_APP_ID` (+ action id) and the widget activates.
- Open question we hit before (on a prior project): World's newer **Relying-Party** model
  (`rp_id` + signer, `/v4/verify`) vs the classic IDKit widget — the docs should make crystal clear
  which flow Selfie Check on Sandbox expects, and give a minimal end-to-end React + server example.

## To record while testing (once app id is set)
- [ ] Sandbox user creation UX and any errors.
- [ ] Proof shape returned by IDKit vs what the verify endpoint expects.
- [ ] Latency and failure modes of Selfie Check in Sandbox.
- [ ] Whether nullifier/one-person-one-action semantics fit "authorize this sale".
