import { Link } from 'wouter';

export function BrandLogo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center group">
      <img
        src="/logo.png"
        alt="Perfectory Voice"
        className="h-9 w-auto object-contain transition-opacity group-hover:opacity-85"
      />
    </Link>
  );
}
