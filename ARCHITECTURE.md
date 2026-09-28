# Frontend architecture

## Source-of-truth rule

The application is a client for deployed smart contracts. Persistent game state
must be read from and written to those contracts through Wagmi/Viem.

- Do not add an application backend, database, API route, server action, or
  hosted persistence service for game state.
- Derive UI state from contract reads, transaction receipts, and contract
  events. Local React state may hold temporary presentation state only.
- Browser storage must not become an authoritative source for player or game
  data.
- External HTTP APIs may be used only for non-authoritative display data and
  must be isolated and clearly documented. Prefer an on-chain read whenever the
  value is available from a contract.
- Contract addresses, ABIs, chain configuration, and numeric conversions should
  stay centralized under `lib/` rather than being duplicated in page modules.

## Current exceptions to remove

1. `lib/backfireContract.ts` is a temporary browser-storage mock because its
   contract is not deployed. It must be replaced by contract reads and writes;
   do not extend the mock to other features.
2. `components/exchange-convert-action.tsx` reads a display price from
   Dexscreener. Conversion amounts themselves are obtained from the deposit
   contract's `estimateSwap` view. Replace the display-price request with a
   contract/oracle read when that interface is available.

## Module boundaries

- `app/`: routing and page composition.
- `components/`: UI and feature-level interaction components.
- `features/<feature>/`: a feature split out of a large component.
  - `lib/`: pure contract decoders, domain rules, and formatting (no React).
  - `hooks/`: the feature's contract reads and data loading.
  - `components/`: sections and dialogs; each dialog owns its inputs and
    transaction lifecycle so the entry component only orchestrates.
  - The public entry component may stay in `components/` so routes keep
    their imports.
- `hooks/`: reusable wallet and contract interaction lifecycle.
  - `use-contract-transaction.ts`: write + receipt + one-shot `onSuccess`.
    Prefer it over hand-wiring `useChainWriteContract` and
    `useWaitForTransactionReceipt` with a success effect.
  - `use-mafia-utils-script.ts`: readiness of a `window.Mafia*` global from
    `/js/mafia-utils.js`. Do not inject the script manually.
- `lib/navigation.ts`: framework-independent route identifiers and path parsing.
- `lib/constants/`: contract ABIs, chain addresses, and static game values.
- `lib/format.ts`: shared, pure display formatting.
- `lib/`: contract adapters and feature-domain helpers that do not render UI.
- `types/`: shared TypeScript declarations.
- `scripts/`: development-time contract inspection utilities; never imported
  into the runtime application.

New features should keep page files thin, place reusable contract interaction
in hooks or adapters, and keep decoding/formatting logic in pure helpers that
can be tested independently.

The `lib/contract.ts` barrel remains a compatibility entry point. New low-level
modules must not import from that barrel because doing so can create circular
dependencies. Import directly from `lib/constants/*` inside foundational
modules, and let UI features use the barrel where the shorter import is useful.

Large feature components should be split incrementally by responsibility:

1. move contract response types and decoders into a feature-domain module;
2. move reusable read/write lifecycles into a hook;
3. extract presentational sections after their inputs are explicit;
4. leave the feature action component responsible for orchestration only.
