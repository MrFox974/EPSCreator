function HomeSkeleton() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
      <div className="overflow-x-auto">
        <div className="h-10 bg-gray-200 rounded mb-2" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomeSkeleton;
