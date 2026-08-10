# UX & Information Architecture Principles

Guidelines for organizing content, navigation, and interaction patterns in Datamart prototypes.

## 1. Visual Hierarchy

- **3 levels max**: page title (H1) → section heading (H2/H3) → detail content
- One H1 per screen. No more than 2 heading levels visible simultaneously
- Metrics / KPIs always above the fold; secondary actions below
- Primary action prominent (top-right or end of form); secondary actions use `variant="outline"` or `variant="ghost"`

## 2. Content Organization

- **F-pattern** for lists and tables — eyes scan horizontal then vertical-left
- **Z-pattern** for overview screens and dashboards
- Group by proximity: related fields in the same `<Card>`, not scattered across the page
- **7 +/- 2 rule**: max items in a navigation group or list without pagination/search

## 3. Progressive Disclosure

- Show only what's needed in the default state; details behind click/expand
- Long forms: use step wizard (`<Tabs>` or multi-step) instead of infinite scroll
- Use `<Tabs>` to group sections of the same entity (e.g., Credentials > General | Permissions | History)
- Use `<Accordion>` or `<Collapsible>` for optional/advanced settings
- Use `<Sheet>` or `<Dialog>` for contextual detail without leaving the page

## 4. Data States

Every screen that displays data MUST handle 4 states:

| State | Component | Pattern |
|-------|-----------|---------|
| **Empty** | `<Empty>` | Illustration/icon + descriptive message + primary CTA. Never leave blank. |
| **Loading** | `<Skeleton>` | Skeleton loaders matching the final layout shape. Use `<Spinner>` only for inline/button loading, not full-page. |
| **Error** | `<Alert variant="destructive">` | Human-readable message + recovery action (retry button, link to support). |
| **Populated** | Actual components | The normal data-filled state. |

## 5. Information Density

Choose the right component for the data shape:

| Pattern | When to use | Component |
|---------|------------|-----------|
| **Table** | 3+ comparable attributes across items, sortable/filterable | `<Table>` with `<Badge>` for status, `<DropdownMenu>` for actions |
| **Cards** | Each item has visual identity or needs inline actions | `<Card>` in grid layout |
| **List rows** | Simple lists with 1-2 attributes + navigation action | `<Item>` component |
| **Empty state** | No data yet | `<Empty>` with icon + CTA |

## 6. Feedback & Affordance

- Every clickable element must have a visible hover state (shadcn components handle this by default)
- **Destructive actions**: always require confirmation via `<AlertDialog>` — never delete on single click
- **Page content loading**: use `<Skeleton>` matching the content layout
- **Inline/button loading**: use `<Spinner>` inside the button with `disabled` state
- **Success feedback**: use `toast` (Sonner) for non-blocking confirmation
- **Form validation**: show errors inline with `<FieldError>` — don't use toast for validation

## 7. Navigation & Flows

- **Breadcrumb** mandatory on level 3+ screens (e.g., Dashboard > Projects > Project Detail)
- **Back** always available in wizard/form flows — never trap the user
- **CTAs**: one primary per screen (the most important action), the rest use `variant="secondary"`, `variant="outline"`, or `variant="ghost"`
- **Sidebar navigation**: group by domain (not by component type). Max 2 nesting levels.
- **Page transitions**: use React Router — no full page reloads

## Quick Decision Tree

```
Need to show a list of items?
  ├── Items have 3+ comparable fields? → Table
  ├── Items have visual identity (image, chart)? → Card grid
  ├── Items are simple with 1-2 fields? → Item list
  └── No items yet? → Empty state with CTA

Need user input?
  ├── 1-3 fields? → Inline form in Card
  ├── 4-8 fields? → Single-page form with Field components
  ├── 8+ fields? → Multi-step wizard with Tabs
  └── Quick edit? → Dialog or Sheet

Need to show detail?
  ├── Brief info on hover? → HoverCard
  ├── Contextual detail without navigation? → Sheet (side panel)
  ├── Full detail page? → New route with Breadcrumb
  └── Confirmation/action? → Dialog or AlertDialog
```
