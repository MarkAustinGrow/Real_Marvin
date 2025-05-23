🌐 AI Webpage Generation Guidelines (FAANG-Style Design)
✅ 1. Framework & Tooling
Use Next.js + Tailwind CSS as the base framework.

Use shadcn/ui for accessible, beautiful UI components.

All components should be:

Mobile-first and responsive

Server-side rendered or statically generated

Structured using semantic HTML

🎨 2. Visual Design System
Spacing & Layout
Use an 8px spacing scale (e.g., gap-2, p-4, mt-8)

Center content within max-w-7xl mx-auto containers

Maintain vertical rhythm (e.g., consistent top/bottom padding across sections)

Typography
Font: Inter, fallback to sans-serif

Use max 3 font sizes:

Headline: text-4xl font-bold

Subheadline: text-xl font-semibold

Body: text-base text-muted-foreground

Headings: Always use semantic <h1> to <h3> based on hierarchy

Color & Contrast
Use a minimal palette:

Primary: bg-primary, text-primary

Accent: subtle highlights, e.g., text-blue-600

Grayscale: Tailwind gray-50 to gray-900

Ensure all colors pass WCAG AA contrast ratio

🧱 3. Page Structure Template
jsx
Copy
Edit
<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <header className="py-8">
    <h1 className="text-4xl font-bold">Page Title</h1>
    <p className="mt-2 text-muted-foreground">Subtitle or description here.</p>
  </header>

  <section className="py-8 border-t">
    <!-- Section content -->
  </section>

  <section className="py-8 border-t">
    <!-- Another content block -->
  </section>

  <footer className="py-10 text-sm text-muted-foreground text-center">
    &copy; {new Date().getFullYear()} Company Name. All rights reserved.
  </footer>
</main>
⚡ 4. Component Use Rules
Use shadcn/ui components for:

Buttons (<Button variant="default">)

Cards (<Card>)

Tabs, Dialogs, Toasts — as needed

Add subtle hover/focus states:

hover:shadow-md transition duration-200

focus:outline-none focus:ring-2 focus:ring-primary

🎯 5. UI/UX Best Practices
Always include:

Clear CTAs (<Button> with action verbs)

Feedback states (loading spinners, success/error)

Error boundaries or messages

Forms must include:

Accessible labels

Required field indicators

Success/error states

🖼️ 6. Imagery and Icons
Use <img> with alt text or next/image for optimized loading

Use icons from lucide-react for consistency and clarity

💡 7. Interactivity Enhancements
Use motion only when helpful (via framer-motion)

Animate:

Page transitions

Modal entrances

Button taps

🧪 8. Testing & Validation
Verify output on mobile (375px width) and desktop (1280px)

Ensure accessibility via aria-* attributes

Validate color contrast and semantic structure