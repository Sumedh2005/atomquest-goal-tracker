interface AvatarProps {
  name: string;
  size?: 'sm' | 'md';
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeStyles = {
    sm: 'w-8 h-8 text-[12px]',
    md: 'w-8 h-8 text-[13px]'
  };

  return (
    <div className={`${sizeStyles[size]} rounded-full bg-[#FEF9EC] text-[#B37800] flex items-center justify-center font-medium`}>
      {initials}
    </div>
  );
}
