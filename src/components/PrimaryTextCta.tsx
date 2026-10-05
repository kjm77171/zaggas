import Link from "next/link";
import type { ComponentProps } from "react";
type Props = ({ href: string } & Omit<ComponentProps<typeof Link>, "href">) | ({ href?: never; loading?: boolean } & ComponentProps<"button">);
export default function PrimaryTextCta(props: Props) {
  if (props.href !== undefined) {
    const { children, className, ...linkProps } = props;
    return <Link {...linkProps} className={`zPrimaryCta ${className ?? ""}`}>{children}<span aria-hidden="true">→</span></Link>;
  }
  const { children, className, loading, disabled, type = "button", ...buttonProps } = props;
  return <button {...buttonProps} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`zPrimaryCta ${className ?? ""}`}>{children}<span aria-hidden="true">→</span></button>;
}