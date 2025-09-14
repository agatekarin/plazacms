---
trigger: always_on
---

### Development Rules for PlazaCMS Admin (Enhanced)

1. **Use pnpm only**
   Always run commands with `pnpm`, **never `npm`**.
   Example:

   ```powershell
   pnpm run lint A:\dev\plazacms\admin\src\app\admin\page.tsx
   ```

2. **Always use full paths**
   Never rely on relative paths. Full paths avoid ambiguity and errors.

3. **Review schema first**
   Before coding or fixing anything, **read and understand**:

   * `A:\dev\plazacms\.mysetting\schema.sql`
   * Documentation: `A:\dev\plazacms\.mysetting\full_schema_documentation.md`
   * Plan: `A:\dev\plazacms\.mysetting\plan.md`


4. **Follow Next.js 15 + TypeScript rules**

   * Make sure all code **complies with Next.js 15** conventions.
   * Follow **TypeScript linting rules**, including `no-explicit-any`.

     * If possible, replace `any` with proper types.
   * **Dynamic API routes:** Always `await params` before using properties.

     ```ts
     // Wrong:
     export function GET(req: Request, { params }: { params: any }) {
       console.log(params.id); // ❌
     }

     // Correct:
     export async function GET(req: Request, context: { params: any }) {
       const { params } = await context;
       console.log(params.id); // ✅
     }
     ```

5. **Design rules**

   * Follow **modern CMS style**, clean and professional.
   * Must be **mobile-friendly**.
   * Include **full icons** for UI elements.
   * Prevent **horizontal overflow** or any **layout overflow bugs** on mobile.

6. **Terminal usage**

   * Always use **PowerShell commands**, not CMD.
   * Make sure commands are fully compatible with PS.

7. **Linting / Code Quality**

   * Run `pnpm run lint <full_path>` for every major file.
   * Fix any warnings/errors, especially `any` type usage in TypeScript.

