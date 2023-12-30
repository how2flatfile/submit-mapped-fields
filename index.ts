import { Client, FlatfileEvent } from "@flatfile/listener";
import api from "@flatfile/api";
import axios from "axios";
import { workbookOne } from "./workbook";

// We use webhook.site to simulate a backend database where data will be submitted (switch the link below to your link, found on webhook.site)
const webhookReceiver = "https://webhook.site/e3431240-e97b-44c1-bada-d6800503ef9e"

export default function flatfileEventListener(listener: Client) {

  // Defining what needs to be done when a new space gets created (when the "space:configure" job gets triggered via the "job:ready" event)
  listener.filter({ job: "space:configure" }).on("job:ready", async (event: FlatfileEvent) => {

    // Accessing the elements we need from event.context to create a space, a workbook, and its sheet
    const { jobId, spaceId } = event.context;
    
    try {

      // First, we acknowledge the job
      await api.jobs.ack(jobId, {
        info: "Acknowledging the 'space:configure' job that is ready to execute and create a space with 1 workbook, 1 sheet and a workbook-level Submit button",
        progress: 10,
      });

      // Second, we create a Workbook (Wokbook One), its Sheet (Contacts), and a workbook-level Submit button
      await api.workbooks.create({
        spaceId,
        name: "Workbook One",
        // We defined the structure of workbookOne in the "workbook.ts" file and imported it here to the "index.ts" file
        sheets: workbookOne,
        actions: [
          {
            operation: "submitAction",
            mode: "foreground",
            label: "Submit",
            description: "Submit data to webhook.site",
            primary: true,
          },
        ],
      });

      // Third, we complete a job once a Space is created and a Workbook, Sheet, and the Submit button are created and attached to it
      await api.jobs.complete(jobId, {
        outcome: {
          message: "Space is created with 1 worksbook, 1 sheet, and a workbook-level Submit button",
        },
      });

    } catch (error) {
      // In case something goes wrong and the "space:configure" job cannot be completed, we fail the job with a message on what next steps to take
      await api.jobs.fail(jobId, {
        outcome: {
          message: "Creating a Space encountered an error. See Event Logs.",
        },
      });
    }
  });

  // Defining what needs to be done when Flatfile is done mapping columns based on user input during the Mapping stage of the import process
  listener.filter({ job: "workbook:map" }).on("job:completed", async ({context: {jobId} }) => {

      // Obtaining the mapping job's execution plan to extract "fieldMapping" out of it, which tells us which fields were mapped in the Matching step
      const jobPlan = await api.jobs.getExecutionPlan(jobId)

      // Initializing an empty array to store the keys of the mapped fields. We need this to later only pass rows of mapped columns to webhook.site
      const mappedFields = [];

      // Iterating through all destination fields that are mapped and extracting their field keys. Then, pushing keys of mapped fields to the "mappedFields" variable
      for (let i = 0; i <  jobPlan.data.plan.fieldMapping.length; i++) {
        const destinationFieldKey = jobPlan.data.plan.fieldMapping[i].destinationField.key;

        mappedFields.push(destinationFieldKey);
      }

      // Looping through all sheets of the Workbook One. For all fields that are mapped, updating those fields' metadata to "{mapped: true}"
      // Now, updated template with metadata will be available to the Submit action below
       workbookOne.forEach(sheet => {
          sheet.fields.forEach(field => {
            if (mappedFields.includes(field.key)) {
              field.metadata = { mapped: true };
            }
          });
       });
    });

  // Defining what needs to be done when a user clicks the "Submit" button (when the "workbook:submitAction" job gets triggered via "job:ready" event)
  listener.filter({ job: "workbook:submitAction" }).on("job:ready", async (event: FlatfileEvent) => {

    // Extracting the necessary information from event.context that we will use below
    const { jobId, workbookId } = event.context;

    // Acknowledging the job
    await api.jobs.ack(jobId, {
      info: "Acknowledging the Submit job that is now ready to execute",
      progress: 10,
    });

    // Retrieving a list of sheets associated with a workbook
    const { data: sheets } = await api.sheets.list({ workbookId });

    // Initializing "records" object that will store data fetched from individual sheets. Right now it is empty
    const records: { [name: string]: any } = {};

    // Iterating through list of sheets and fetching records for each sheet. Now, fetched data is stored in "records" object with keys in the format of "Sheet[index]"
    for (const [index, element] of sheets.entries()) {
      records[`Sheet[${index}]`] = await api.records.get(element.id);
    }

    // Initializing an array that will contain field keys of mapped fields only
    const mappedFieldsforSubmitAction = [];

    // Iterating through workbookOne and extracting field keys with "metadata: { mapped: true }" from the Contacts sheet. Pushing those field keys to mappedFieldsforSubmitAction
    workbookOne[0].fields.forEach(field => {
      if (field.metadata && field.metadata.mapped === true) {
        mappedFieldsforSubmitAction.push(field.key);
      }
    });

    // Creating recordOfMappedFieldsContactsSheet that will store records only for the fields that were mapped
    const recordsOfMappedFieldsContactsSheet = records["Sheet[0]"].data.records.map(record => {
      
      // Initializing filteredRecord object to store exactly what we want about each record
      const filteredRecord = {
        id: record.id,
        values: {},
        metadata: {},
        valid: record.valid,
      };

      // Looing through all mapped fields and informing "filteredRecord" to only store record data for mapped fields (found inside of mappedFieldsforSubmitAction)
      for (const column of mappedFieldsforSubmitAction) {
        if (record.values[column]) {
          filteredRecord.values[column] = record.values[column];
        }
      }
      return filteredRecord;
    });

    // Sending data of records belonging only to mapped fields to webhook.site URL once a user clicks the Submit button
    const response = await axios.post(webhookReceiver,
      {
        recordsOfMappedFieldsContactsSheet,
      }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // If the axios POST call fails, the error below is thrown
    if (response.status !== 200) {
      throw new Error("Failed to submit data to webhook.site");
    }

    // If the axios POST call is successful, we complete the job with an appropriate message to the user
    await api.jobs.complete(jobId, {
      outcome: {
        message: `Mapped fields were submitted to webhook.site. Go check it out at ${webhookReceiver}`,
      },
    });

    // Now that data is submitted to webhook.site, deleting "mapped: true" from field metadata. That way, subsequent imports don't inherit mapping information from previous imports
      workbookOne.forEach(sheet => {
        sheet.fields.forEach(field => {
          if (field.metadata && field.metadata.mapped === true) {
            // Remove only the "mapped: true" property while preserving other properties
            delete field.metadata.mapped;
          }
        });
      });

  });

}
