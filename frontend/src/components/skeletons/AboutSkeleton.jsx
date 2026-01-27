function AboutSkeleton() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
      <div className="space-y-4 max-w-2xl">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default AboutSkeleton;
