/**
 * Root page -- temporary placeholder until i18n routing is set up in Task 2.
 * Shows UniBoard branding with paper texture visible.
 */
export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-text-1 mb-4">
          UniBoard
        </h1>
        <p className="text-text-2">Your GPA, Maximized.</p>
      </div>
    </div>
  );
}
