export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full py-16">
      <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
    </div>
  );
}
