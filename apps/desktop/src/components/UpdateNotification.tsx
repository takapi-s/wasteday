import { useUpdater } from '../hooks/utils';

export function UpdateNotification() {
  const { updateInfo, isInstalling, installUpdate } = useUpdater();

  if (!updateInfo.available || updateInfo.error) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">アップデートが利用可能です</h3>
          <p className="text-sm opacity-90">
            バージョン {updateInfo.version} が利用可能です
          </p>
        </div>
        <button
          onClick={installUpdate}
          disabled={isInstalling}
          className="ml-4 bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isInstalling ? 'インストール中...' : 'インストール'}
        </button>
      </div>
    </div>
  );
}
