<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Server-side data lives in root `servidor/` (*.server.ts, JSON file at servidor/dados/banco.json, gitignored), loaded via dynamic import inside `src/routes/api/*` handlers — the user self-hosts with `npm run dev -- --host` on their own machine, where Node fs is available.
