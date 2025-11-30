import * as React from "react";

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={(className ?? "") + " bg-muted animate-pulse rounded-md"} />
);

export default Skeleton;
