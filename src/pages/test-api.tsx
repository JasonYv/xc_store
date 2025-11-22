export default function TestApi() {
  const testApi = async () => {
    const response = await fetch('/api/merchants/send-message');
    const data = await response.json();
    console.log('API Response:', data);
  };

  return (
    <div className="p-4">
      <button 
        onClick={testApi}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test API
      </button>
    </div>
  );
} 