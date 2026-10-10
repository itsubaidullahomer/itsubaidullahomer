// TODO(pricing): supply real starting prices and currency before publishing prices.
// Null is intentional: the UI must never display an invented price or a TODO.
export const pricing: { name: string; description: string; startingAt: number | null; currency: string; includes: string[] }[] = [
 { name: 'Landing page', description: 'A clear story. A fast page. Details that feel considered.', startingAt: null, currency: 'USD', includes: ['Design and development', 'Responsive layouts and motion', 'SEO and deployment'] },
 { name: 'Product build', description: 'From the first data model to the feature your customers use.', startingAt: null, currency: 'USD', includes: ['Full-stack product engineering', 'AI, payments and integrations', 'Production handoff'] },
 { name: 'Ongoing engineering', description: 'An engineer who knows the product and keeps moving it forward.', startingAt: null, currency: 'USD', includes: ['Features and product iterations', 'Performance and reliability', 'A direct working relationship'] },
];
