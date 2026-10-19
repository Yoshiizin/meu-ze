import {Fragment, type ReactNode} from 'react';

// Render plain user text as text nodes, and only HTTP(S) URLs as real links.
// Never parse user-supplied HTML or allow javascript:/data: link destinations.
const urlPattern = /https?:\/\/[^\s<>"'`]+|www\.[^\s<>"'`]+/gi;
const trailingPunctuation = /[.,!?;:]+$/;

function splitTrailingPunctuation(value: string): [string, string] {
  let url = value;
  let suffix = '';
  while (url) {
    const punctuation = url.match(trailingPunctuation);
    if (punctuation) {
      suffix = punctuation[0] + suffix;
      url = url.slice(0, -punctuation[0].length);
      continue;
    }
    const last = url[url.length - 1];
    const opening = last === ')' ? '(' : last === ']' ? '[' : last === '}' ? '{' : '';
    if (opening && url.split(last).length > url.split(opening).length) {
      suffix = last + suffix;
      url = url.slice(0, -1);
      continue;
    }
    break;
  }
  return [url, suffix];
}

export default function LinkifiedText({text}: {text: string}) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(urlPattern)) {
    const index = match.index;
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    const [label, suffix] = splitTrailingPunctuation(match[0]);
    try {
      const url = new URL(/^www\./i.test(label) ? 'https://' + label : label);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
      parts.push(<a key={index} className="ze-external-link" href={url.href} target="_blank" rel="noopener noreferrer" title={'Abrir ' + url.hostname}>{label}</a>);
    } catch {
      parts.push(label);
    }
    if (suffix) parts.push(suffix);
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <Fragment>{parts}</Fragment>;
}
