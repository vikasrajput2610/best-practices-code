// Import the Pinecone library
import { Pinecone } from "@pinecone-database/pinecone";
import fs from 'fs'
import axios from "axios";

// Initialize a Pinecone client with your API key
const pc = new Pinecone({
  apiKey:
    "api key",
});

// A function to read data from a JSON file
async function readDataFromFile(filePath: string): Promise<any> {
  const file = await import(filePath);

  return file.default;
}

// Convert the text into numerical vectors that Pinecone can index
const model = "multilingual-e5-large";

async function generateEmbedding(data: any) {
  const embeddings = await pc.inference.embed(
    model,
    data.map(
      (practice: any) =>
        `${practice.description} Business Process: ${practice.businessProcess}. Service Component: ${practice.serviceDeliveryComponent}. Themes: ${practice.themes}.`
    ),
    {
      inputType: "passage",
      truncate: "END",
    }
  );

  return embeddings;
}

function createRecords(embeddings: any, data: any) {
  const records = data.map((practice: any, i: any) => ({
    id: practice.bestPracticeId,
    values: embeddings[i].values,
    metadata: {
      bestPracticeId: practice.bestPracticeId,
      programId: practice.programId,
      description: practice.description,
      businessProcess: practice.businessProcess.split(","),
      serviceDeliveryComponent: practice.serviceDeliveryComponent.split(","),
      certificationStatus: practice.certificationStatus,
      themes: practice.themes.split(","),
      levelOfEffort: practice.levelOfEffort,
      timeFrame: practice.timeFrame,
      code: practice.code,
      approach:practice.approach
    },
  }));

  return records;
}

function batchRecords(records: any[], batchSize = 96) {
  const batches = [];
  let i;
  for (i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }
  return batches;
}


function stripHtmlTags(htmlStrings: string[]): string[] {
  return htmlStrings.flatMap((html) => {
    if (typeof html !== "string") {
      return []; 
    }
   
    return html
      .split(/<\/li>/) // Split at the ending </li> tag
      .map((part) =>
        part
          .replace(/<\/?[^>]+(>|$)/g, "") // Remove HTML tags
          .replace(/[\t\n]/g, "") 
          .trim() // Trim whitespace
      )
      .filter((item) => item !== "");
  });
}


const getData=async()=>{
 const data=await readDataFromFile('./BPFIN.json');
//  console.log(data)
 const finalResult:Array<any>=[]
 for (const item of data.bestPractices) {
    const res= await axios.get(`https://advservices-qa.poweredbyhackett.com/advisory-service/api/v1/best-practice/${item.bestPracticeId}`,{
      headers:{
        Authorization:'Bearer <token>'
      }
    })
    const finalData= await res.data.bestPractice;
    const approach=stripHtmlTags(finalData.approach);
    item.approach=approach;
    // console.log("the approach is ===>>>",item)
    finalResult.push(item);
  }
  // console.log("the data is ===>>>",finalResult)
  data.bestPractices=finalResult;
  return data;
}


async function main() {
  const data = await readDataFromFile("./BPFIN_new.json");

  const batches = batchRecords(data.bestPractices);

  for (const batch of batches) {
    const embeddings = await generateEmbedding(batch);
    const records = createRecords(embeddings, batch);
    const index = pc.index("best-practices-new");
    await index.upsert(records);
  }
}


// (async()=>{
//   const data=await getData();
//   console.log("the data is ==>>>",data)
//   fs.writeFileSync('BPFIN_new.json', JSON.stringify(data, null, 2), 'utf-8');
// })()
main();
