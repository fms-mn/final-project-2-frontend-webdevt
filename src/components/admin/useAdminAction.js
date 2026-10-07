import { useCallback, useState } from 'react';
import { describeError } from '../../utils/adminTools';

// One write at a time per screen: shows a busy state while it runs, then the outcome.
export default function useAdminAction() {
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const clear = useCallback(() => { setError(''); setNotice(''); }, []);

  const run = useCallback(async (action, message, actionId = 'save') => {
    setBusyAction(actionId);
    try {
      await action();
      setError('');
      setNotice(message);
      return true;
    } catch (err) {
      setError(describeError(err));
      setNotice('');
      return false;
    } finally {
      setBusyAction('');
    }
  }, []);

  return { busy: busyAction !== '', busyAction, error, notice, setError, clear, run };
}
