import { test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BlurHashImage } from '@/components/ui/blur-hash-image';

test('BlurHashImage should render blur hash placeholder', () => {
  const { container } = render(
    <BlurHashImage 
      src="/test.jpg" 
      blurHash="LEHV6nWB2yk8pyo0adR*.7kCMdnj" 
      alt="Test"
      width={800}
      height={600}
    />
  );
  
  expect(container.querySelector('[data-blurhash]')).toBeTruthy();
});
