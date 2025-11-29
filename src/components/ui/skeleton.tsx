import * as React from "react";

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={(className ?? "") + " animate-pulse rounded-md bg-muted"} />
);

export default Skeleton;
