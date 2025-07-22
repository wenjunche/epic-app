import type Client from "fhirclient/lib/Client";
import type { HumanName, Patient } from 'fhir/r4';

// Extend the Window interface to include fdc3
declare global {
  interface Window {
    fdc3?: {
      broadcast: (context: unknown) => Promise<void>;
    };
  }
}

export type Appointment = {
    id: string;
    status: string;
    start: string;
    end: string;
};

type AppointmentResponse = {
    entry?: Array<{
        resource: {
            id: string;
            status: string;
            start: string;
            end: string;
        };
    }>;
};

const checkAppointments = async (client: Client) => {
  console.log("Fetching appointments for the current patient...");
  try {
    const resp = await client.patient.request('Appointment', {
      pageLimit: 1,
    //   resolveReferences: [ 'participant..actor' ],
    }) as AppointmentResponse;
    console.log("Response from Appointment request:", resp);
    const appointments = resp.entry?.map((entry) => {
        return {
            id: entry.resource.id,
            status: entry.resource.status,
            start: entry.resource.start,
            end: entry.resource.end,
        };
    }) || [];

    for (const appointment of appointments) {
        await broadcast({
            type: "fdc3.appointment",
            id: {
                value: appointment.id
            },
            status: appointment.status,
            start: appointment.start,
            end: appointment.end
        });
    }
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw error;
  }
}

type ConditionResponse = {
    code: {
        text: string;
    },
    encounter: {
        reference: string;
    },
    id: string;
    recordedDate: string;
}
const checkConditions = async (client: Client) => {
  console.log("Fetching conditions for the current patient...");
  try {
    const conditions = await client.patient.request('Condition', {
      pageLimit: 1,
      flat: true,
    }) as ConditionResponse[];
    console.log("Response from Condition request:", conditions);

    for (const condition of conditions) {
        await broadcast({
            type: "fdc3.condition",
            id: {
                value: condition.id
            },
            code: condition.code.text,
            encounter: condition.encounter.reference,
            recordedDate: condition.recordedDate
        });
    }
  } catch (error) {
    console.error("Error fetching conditions:", error);
    throw error;
  }
}

type DiagnosticReportResponse = {
    entry: Array<{
        fullUrl: string;
        resource: {
            id: string;
            code: {
                coding: Array<{
                    system: string;
                    code: string;
                    display: string;
                }>;
                text: string;
            },
            encounter: {
                reference: string;
            },
            status: string;
        };
    }>;
};

const checkDiagnosticReport = async (client: Client) => {
  console.log("Fetching diagnostic reports for the current patient...");
  try {
    const resp = await client.patient.request('DiagnosticReport', {
      pageLimit: 1,
    }) as DiagnosticReportResponse;
    for (const entry of resp.entry) {
      const report = entry.resource;
        await broadcast({
            type: "fdc3.diagnosticReport",
            id: {
                value: report.id
            },
            code: {
                system: report.code.coding[0].system,
                code: report.code.coding[0].code,
                display: report.code.coding[0].display,
                text: report.code.text
            },
            encounter: report.encounter.reference,
            status: report.status
        });
    }
    console.log("Response from DiagnosticReport request:", resp);
  } catch (error) {
    console.error("Error fetching diagnostic reports:", error);
    throw error;
  }
}

const broadcast = async (context: unknown) => {
    if (window.fdc3) {
        console.log("Broadcasting context:", context);
        await window.fdc3.broadcast(context);
    };
}

  // Helper function to safely get the patient's full name
export const getPatientName = (name: HumanName[] | undefined) => {
    if (!name || name.length === 0) return 'Unknown Name';
    const officialName = name.find(n => n.use === 'official') || name[0];
    const given = officialName.given?.join(' ') || '';
    const family = officialName.family || '';
    return `${given} ${family}`;
};

const broadcastPatientContext = async (parent: Patient) => {
    await broadcast({
        type: "fdc3.patient",
        id: {
            value: parent.id || ''
        },
        name: getPatientName(parent.name)
    });
};

export const updatePatient = async (client: Client, patient: Patient) => {
    await broadcastPatientContext(patient);
    await checkAppointments(client);
    await checkConditions(client);
    await checkDiagnosticReport(client);
}
