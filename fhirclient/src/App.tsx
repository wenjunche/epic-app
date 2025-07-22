import React, { useCallback, useEffect, useState } from 'react';
import FHIR from 'fhirclient';
import type { Patient } from 'fhir/r4';
import type Client from 'fhirclient/lib/Client';
import type { fhirclient } from 'fhirclient/lib/types';
import { getPatientName, updatePatient } from './patient';


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

  const [ currentPatient, setCurrentPatient ] = useState<Patient | null>(null);

  const resetSession = useCallback(() => {
    console.log("Session reset detected. Clearing current patient.");
    setCurrentPatient(null);
    sessionStorage.clear();
    window.location.href = `${window.location.href}?iss=https%3A%2F%2Flaunch.smarthealthit.org%2Fv%2Fr4%2Ffhir&launch=WzAsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMSwiIl0`;
  }, []);

  useEffect(() => {
    if (!patient) return;
    if (patient.id !== currentPatient?.id) {
      setCurrentPatient(patient);
    }
  }, [currentPatient?.id, patient]);

  useEffect(() => {
    console.log("Patient data:", currentPatient);
    const broadcastPatientContext = async () => {
      if (currentPatient && window.fdc3) {
        const context = {
            type: "fdc3.patient",
            id: {
              value: currentPatient.id || ''
            },
            name: getPatientName(currentPatient.name)
          };
          console.log("Broadcasting context:", context);
          await window.fdc3.broadcast(context);
        };
      }
      broadcastPatientContext();
  }, [currentPatient]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">

      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Patient Information</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm" onClick={resetSession}>
          Back
        </button>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
        <div><strong>Name:</strong> {getPatientName(patient.name)}</div>
        <div><strong>Gender:</strong> {patient.gender || 'N/A'}</div>
        <div><strong>Birth Date:</strong> {patient.birthDate || 'N/A'}</div>
        <div><strong>FHIR ID:</strong> {patient.id || 'N/A'}</div>
      </div>
    </div>
  );
};


  const handleLaunch = () => {
    const url = new URL(window.location.href);
    const issToken = url.searchParams.get('iss');
    const launchToken = url.searchParams.get('launch');
    console.log("issToken:", issToken, "launchToken:", launchToken);
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    console.log("Redirect URI:", redirectUri);

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
      redirectUri: redirectUri,

      // For standalone testing, you must provide the issuer URL.
      // The SMART App Launcher (https://launch.smarthealthit.org/) is the
      // best tool for testing a true EHR launch.
      iss: issToken || '', // Replace with your actual FHIR server URL
    };
    FHIR.oauth2.authorize(config);
  };

/**
 * A component to initiate a standalone launch for testing purposes.
 */
const LaunchScreen: React.FC = () => {
    
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
            console.log("Read Patient data:", patientData);
            setLoading(false);
            const newPatient = patientData as Patient;
            // Check if the patient data has changed
            if (!patient || patient.id !== newPatient.id) {
              setPatient(patientData as Patient);
              updatePatient(client, newPatient);
            }
          })
          .catch(err => {
            setError(err);
            setLoading(false);
          });

      })
      .catch(err => {
        console.warn("FHIR.oauth2.ready() failed:", err);
        // This is not an error if the app is not in a launch sequence.
        // It simply means we need to initiate the launch.

        handleLaunch(); // Initiate the launch process
        // console.log("Not in a launch sequence. Ready to authorize.");
        // setError(null); // Clear any previous errors
        // setLoading(false);
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
