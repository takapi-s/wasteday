import { useUserInfo } from "../../stores/userStore";

export default function HomePage() {
  const { displayName, email, tenantName } = useUserInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {displayName}!
              </h1>
              <p className="text-gray-600 mt-2">
                {email} • {tenantName}
              </p>
            </div>
            <form method="post" action="/logout">
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </form>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-base text-gray-900">{email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tenant</p>
                <p className="text-base text-gray-900">{tenantName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
