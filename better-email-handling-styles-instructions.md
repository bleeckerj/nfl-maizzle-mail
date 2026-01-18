**Goal**

My Maizzle-compiled HTML email looks fine on desktop, but **text appears too small on mobile (especially Gmail iOS/Android)** because the layout gets zoomed out instead of behaving responsively.

Update the templates so that:

1. **Mobile media queries are actually applied in Gmail.**
2. **Font sizes do not get reduced on mobile**, only layout/padding is adjusted.
3. The **main container is fluid** and doesn’t force Gmail to zoom the whole email.

---

### Required changes

1. **Remove `media="screen"` from `<style>` tags**

   In my base layout/template files:

   * Find blocks like:

     ```html
     <style media="screen" type="text/css">
       @media screen and (max-width:599px) {
         ...
       }
     </style>
     ```
   * Change them to:

     ```html
     <style type="text/css">
       @media screen and (max-width:599px) {
         ...
       }
     </style>
     ```

   Gmail ignores `<style media="screen">` inside HTML emails, so the media queries must live in plain `<style>` tags.

2. **Do NOT shrink font sizes in the mobile `@media` query**

   In the mobile CSS, locate rules like:

   ```css
   @media screen and (max-width:599px) {
     .large, h1 {
       font-size: 19px !important;
       line-height: 27px !important;
     }
   }
   ```

   or any similar font-size reductions.

   Change them so that **mobile font sizes are at least as large as desktop**, or simply keep them the same. For example:

   ```css
   @media screen and (max-width:599px) {
     .large, h1 {
       font-size: 21px !important;
       line-height: 30px !important;
     }
     /* Keep other mobile tweaks (padding, margins, image width) but do not reduce font-size */
   }
   ```

   The mobile query should primarily adjust **spacing and layout**, not decrease type size.

3. **Ensure a clear, consistent base font size**

   * On `<body>` and core text elements (`p`, `.large`, `h1`, etc.), make sure the base size is set in **pixels**, e.g.:

     ```html
     <body style="margin:0; padding:0; -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; font-family:-apple-system,system-ui,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:16px; line-height:23px;">
     ```

   * For main reading paragraphs and large intro text:

     ```css
     p,
     .large {
       font-size: 16px;
       line-height: 23px;
     }

     h1 {
       font-size: 21px;
       line-height: 23px;
     }
     ```

   * Do **not** override these with smaller values only in the mobile query.

4. **Make the main container fluid without relying solely on the media query**

   In the compiled HTML where the main container is set, ensure something like this:

   ```html
   <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
     <tr>
       <td align="center">
         <div style="max-width:640px; margin:0 auto;">
           <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;">
             ...
           </table>
         </div>
       </td>
     </tr>
   </table>
   ```

   Key points:

   * Outer wrapper table is `width="100%"`.
   * Inner table uses `width="100%"` with `style="max-width:640px;"`.
   * Avoid relying on **only** `width="640"` with no `width:100%` in CSS; make sure there is a fluid behavior baked into the markup.

5. **Keep mobile behavior focused on layout, not typography**

   In the `@media screen and (max-width:599px)` block:

   * Keep and/or add rules that:

     * Make `.force-row`, `.container`, `.header`, `.body`, `.footer` width `100% !important`.
     * Adjust paddings (`.padl20`, `.padr20`, `.padt20`, etc.).
     * Make images full-width for content blocks where appropriate.

   * Do **not**:

     * Decrease `font-size` for key reading elements (`p`, `.large`, `h1`, `.small`) compared to desktop.
     * Introduce any `transform`, `zoom`, or similar properties that would cause Gmail to rescale the entire email.

---

### Summary for Copilot

> Update my Maizzle HTML email templates so that Gmail mobile clients don’t zoom the layout and shrink text.
>
> * Move all `@media` rules into plain `<style type="text/css">` (no `media="screen"`).
> * Keep font sizes for headings and body text the same or larger on mobile; don’t reduce them in the mobile query.
> * Ensure the main container is fluid (`width:100%` with `max-width:640px`) so the layout fits small screens without Gmail needing to zoom.
> * Keep mobile CSS focused on layout (padding, margins, image widths), not shrinking typography.

Use these rules to refactor my existing templates (`layout`, header/body/footer partials, and any shared CSS), preserving the current visual design while preventing mobile font shrink.
