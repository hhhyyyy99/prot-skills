import { Toast } from './Toast';
import { useToast } from '../../hooks/useToast';

function ToastViewport() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <Toast key={t.id} {...t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

export { ToastViewport };
