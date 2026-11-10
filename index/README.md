# GCB Index

Builds a searchable contract catalog and dependency graph from CUE contracts under `core/`. Each contract is `valid` when it exports and normalizes successfully; failed exports are reported as errors.

## Post-migration tooling

```sh
npm run index:build
npm run index:verify
npm run index:status
npm run index:watch
```

The build writes `out/index.json`, `out/index.md`, and `out/index.html`. `index:verify` also fails on cycles, non-primitive orphans, and dependency-bucket/kind mismatches.

`index:status` prints one status line per contract and a count summary.

The HTML report is self-contained and can be opened directly from disk. It groups contracts by domain, supports search, status filtering, dependency navigation, and diagnostic categories. It also draws a selected contract's immediate dependency neighborhood.