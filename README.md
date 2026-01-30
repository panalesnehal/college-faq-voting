# College FAQ Voting System

Calm, FAQ-style voting tool to surface the most confusing student questions.

Usage:
- Add your Firebase config to `firebase.js` as `window.FIREBASE_CONFIG` (optional).
- Open `index.html` in a browser. If Firestore is not configured or fails, demo FAQs are shown.

Data model (Firestore collection `faqs`):
```
{ question: string,
  category: "Academics" | "Exams" | "Fees" | "Placements" | "Administration",
  upvotes: number,
  createdAt: timestamp }
```

Acceptance checklist:
- FAQs visible on page load
- Clicking question expands/collapses
- Upvote count increases instantly (optimistic UI)
- Refresh keeps vote counts (when Firestore configured; demo persists locally)
- Sorting and filtering work
- Empty DB shows sample FAQ entries
