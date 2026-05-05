import type { ServerModel } from '../types';

const modelConfig: Record<ServerModel, { label: string; classes: string }> = {
  model_1: {
    label: 'Model 1',
    classes: 'bg-purple-100 text-purple-800 ring-purple-300',
  },
  model_2: {
    label: 'Model 2',
    classes: 'bg-teal-100 text-teal-800 ring-teal-300',
  },
  model_3: {
    label: 'Model 3',
    classes: 'bg-pink-100 text-pink-800 ring-pink-300',
  },
};

interface ModelBadgeProps {
  model: ServerModel;
}

export default function ModelBadge({ model }: ModelBadgeProps) {
  const config = modelConfig[model] ?? {
    label: model,
    classes: 'bg-gray-100 text-gray-700 ring-gray-300',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
