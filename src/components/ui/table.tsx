import * as React from "react";

export const Table: React.FC<React.ComponentProps<"table">> = ({
  className,
  ...props
}) => <table {...props} className={(className ?? "") + " w-full text-sm"} />;
export const THead: React.FC<React.ComponentProps<"thead">> = ({
  className,
  ...props
}) => <thead {...props} className={(className ?? "") + " bg-muted"} />;
export const TBody = (props: React.ComponentProps<"tbody">) => (
  <tbody {...props} />
);
export const TR = (props: React.ComponentProps<"tr">) => (
  <tr {...props} className={(props.className ?? "") + " border-b"} />
);
export const TH: React.FC<React.ComponentProps<"th">> = ({
  className,
  ...props
}) => (
  <th
    {...props}
    className={
      (className ?? "") +
      " text-muted-foreground px-3 py-2 text-left font-medium"
    }
  />
);
export const TD: React.FC<React.ComponentProps<"td">> = ({
  className,
  ...props
}) => <td {...props} className={(className ?? "") + " px-3 py-2"} />;
