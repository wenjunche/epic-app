FHIR.oauth2.ready().then(client => {
  const patientId = client.getPatientId();

  client.request(`Patient/${patientId}`).then(patient => {
    const div = document.getElementById("patient");
    const name = patient.name?.[0];
    const fullName = name ? `${name.given?.[0]} ${name.family}` : "Unknown";

    div.innerHTML = `
      <strong>Name:</strong> ${fullName}<br>
      <strong>Gender:</strong> ${patient.gender}<br>
      <strong>DOB:</strong> ${patient.birthDate}
    `;
  });
});
