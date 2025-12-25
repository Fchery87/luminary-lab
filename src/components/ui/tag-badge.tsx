import { Badge } from '@/components/ui/badge';

interface TagBadgeProps {
  name: string;
  type: string;
  onRemove?: () => void;
}

const tagColors: Record<string, { bg: string; text: string; border: string }> = {
  camera: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  lens: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  date_range: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/20',
  },
  iso_range: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  focal_length: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
  },
  custom: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/20',
  },
};

export function TagBadge({ name, type, onRemove }: TagBadgeProps) {
  const colors = tagColors[type] || tagColors.custom;

  return (
    <Badge
      variant="outline"
      className={`${colors.bg} ${colors.text} ${colors.border} border backdrop-blur-sm transition-all hover:opacity-80`}
    >
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1.5 hover:bg-white/10 rounded-full p-0.5 transition-colors"
          aria-label="Remove tag"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </Badge>
  );
}

interface ProjectTagsProps {
  tags: Array<{ name: string; type: string }>;
  maxTags?: number;
}

export function ProjectTags({ tags, maxTags = 3 }: ProjectTagsProps) {
  const visibleTags = tags.slice(0, maxTags);
  const remainingTags = tags.length - maxTags;

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleTags.map((tag, index) => (
        <TagBadge key={index} name={tag.name} type={tag.type} />
      ))}
      {remainingTags > 0 && (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20 backdrop-blur-sm">
          +{remainingTags}
        </Badge>
      )}
    </div>
  );
}
