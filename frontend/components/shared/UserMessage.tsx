"use client";

export interface UserMessageProps {
  content: string;
}

/**
 * User message — orange right-aligned bubble preserved from v2.0.
 * Per D-40-05 user/assistant visual asymmetry — user keeps brand bubble,
 * assistant flows in serif (StreamingAssistant.tsx).
 */
export default function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-[8px]">
      <div className="max-w-[85%] px-[14px] py-[10px] rounded-[12px] rounded-br-[4px] bg-orange text-white text-[0.82rem] leading-[1.55] whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
