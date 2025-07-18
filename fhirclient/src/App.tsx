import React, { useEffect, useState } from 'react';
import FHIR from 'fhirclient';
import type { HumanName, Patient } from 'fhir/r4';
import type Client from 'fhirclient/lib/Client';
import type { fhirclient } from 'fhirclient/lib/types';


/**
 * A simple loading spinner component.
 */
const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full">
    <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
    <p className="mt-4 text-lg text-gray-600">Connecting to EHR...</p>
  </div>
);

/**
 * A component to display errors.
 */
const ErrorDisplay: React.FC<{ error: Error }> = ({ error }) => (
  <div className="p-6 bg-red-100 border-l-4 border-red-500 rounded-r-lg">
    <h3 className="text-xl font-bold text-red-800">An Error Occurred</h3>
    <p className="mt-2 text-red-700">Could not connect to the FHIR server. Please check the console for details.</p>
    <pre className="mt-4 p-3 text-sm bg-red-200 text-red-900 rounded overflow-x-auto">
      {error.message}
    </pre>
  </div>
);

/**
 * A component to display the patient's demographic data.
 */
const PatientBanner: React.FC<{ patient: Patient }> = ({ patient }) => {
  // Helper function to safely get the patient's full name
  const getPatientName = (name: HumanName[] | undefined) => {
    if (!name || name.length === 0) return 'Unknown Name';
    const officialName = name.find(n => n.use === 'official') || name[0];
    const given = officialName.given?.join(' ') || '';
    const family = officialName.family || '';
    return `${given} ${family}`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">Patient Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
        <div><strong>Name:</strong> {getPatientName(patient.name)}</div>
        <div><strong>Gender:</strong> {patient.gender || 'N/A'}</div>
        <div><strong>Birth Date:</strong> {patient.birthDate || 'N/A'}</div>
        <div><strong>FHIR ID:</strong> {patient.id || 'N/A'}</div>
      </div>
    </div>
  );
};

/**
 * A component to initiate a standalone launch for testing purposes.
 */
const LaunchScreen: React.FC = () => {
    
  const handleLaunch = () => {
    const url = new URL(window.location.href);
    const issToken = url.searchParams.get('iss');
    const launchToken = url.searchParams.get('launch');
    console.log("issToken:", issToken, "launchToken:", launchToken);

    // This configuration is for STANDALONE launch testing.
    // In a real EHR launch, the EHR provides the 'iss' and 'launch'
    // parameters in the URL, and fhirclient handles them automatically.
    const config: fhirclient.AuthorizeParams = {
      // You must register your app with the EHR and get a client_id
      clientId: "6f57f594-597d-466a-ac4f-2d308fc38410", // Replace with your actual client_id
      
      // The permissions your app is requesting
      scope: "launch openid fhirUser patient/Patient.read",
      
      // The URL to redirect to after authorization.
      // This must be one of the URLs registered with the EHR.
      redirectUri: window.location.origin,

      // For standalone testing, you must provide the issuer URL.
      // The SMART App Launcher (https://launch.smarthealthit.org/) is the
      // best tool for testing a true EHR launch.
      iss: issToken || '', // Replace with your actual FHIR server URL
    };
    FHIR.oauth2.authorize(config);
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold mb-4">SMART on FHIR App</h2>
      <p className="text-gray-600 mb-6">This app needs to be launched from an EHR or a simulator.</p>
      <button
        onClick={handleLaunch}
        className="px-6 py-3 font-bold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
      >
        Launch Standalone (for testing)
      </button>
      <p className="mt-4 text-sm text-gray-500">
        For a true EHR launch test, please use the <a href="https://launch.smarthealthit.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">SMART App Launcher</a>.
      </p>
    </div>
  );
};


/**
 * The main App component that orchestrates the SMART launch flow.
 */
export default function App() {
  const [client, setClient] = useState<Client | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    /**
     * FHIR.oauth2.ready() is the core of the client. It handles the OAuth2 redirect
     * and returns a Promise that resolves with a fhirclient.Client instance.
     * * - If the page is loaded after a redirect from an auth server, it
     * completes the handshake and resolves with an authorized client.
     * - If the page is loaded directly, it rejects the promise.
     */
    FHIR.oauth2.ready()
      .then(client => {
        setClient(client);
        // Fetch the patient data now that we have an authorized client
        client.patient.read()
          .then(patientData => {
            setPatient(patientData as Patient);
            setLoading(false);
          })
          .catch(err => {
            setError(err);
            setLoading(false);
          });
      })
      .catch(err => {
        // This is not an error if the app is not in a launch sequence.
        // It simply means we need to initiate the launch.
        console.log("Not in a launch sequence. Ready to authorize.");
        setError(null); // Clear any previous errors
        setLoading(false);
      });
  }, []); // The empty dependency array ensures this runs only once on mount.

  // Conditional rendering based on the state
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <main className="w-full max-w-4xl mx-auto">
        {patient && client ? (
          <div className="space-y-6">
            <PatientBanner patient={patient} />
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Launch Context</h3>
              <pre className="p-3 text-sm bg-gray-100 text-gray-900 rounded overflow-x-auto">
                {JSON.stringify(client.getState(), null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <LaunchScreen />
        )}
      </main>
    </div>
  );
}