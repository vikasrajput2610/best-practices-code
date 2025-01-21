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
        Authorization:'Bearer eyJraWQiOiJyd2JKTnY5UG1tRkxNWHB4R1FzVW9YK3FMdjhrR01jRHVSb3VCVGo0RDJvPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIyNDBhODhjZi1kNTUyLTRmNWMtYWY2NS0zMTAzMDgxNTVmNDkiLCJjdXN0b206cGxhdGZvcm0iOiJbIFwiaGFja2V0dC1jb25uZWN0XCIsIFwiaGFja2V0dC1jb25uZWN0XCIgXSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9Xc0JIVlgyNkEiLCJjb2duaXRvOnVzZXJuYW1lIjoiMjQwYTg4Y2YtZDU1Mi00ZjVjLWFmNjUtMzEwMzA4MTU1ZjQ5Iiwib3JpZ2luX2p0aSI6ImJhYTM0NjE5LThlZjYtNDQzZC1hZjIxLTYwYWUwY2Y3MDFlOCIsImF1ZCI6IjQ2a2tzMzBlc2VvdjJhOW11b2EwbGgwY2xtIiwiZXZlbnRfaWQiOiJmOGQ5MDkzOS1jYTJlLTQzZjQtOTk2MS0yNjQxMmI5NDc3ZDAiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTczNzM3NjgwNywiZXhwIjoxNzM3NDYzMjA3LCJpYXQiOjE3MzczNzY4MDcsImp0aSI6IjcwZjk5ZDEzLTZhNGMtNGVhZi1hNDQ2LTE3OTBkYTllNzk0ZSIsImVtYWlsIjoiYW5rZXNoQGxlZXdheWhlcnR6LmNvbSJ9.ACFMDZ9UTw2F55aIMNeQi6Xj45sDiaAFN1V_fl4lktzGW4WdtwSs_zga9uV-Ccq861HY7EkewBmrn4oqeft1UGOjdfe5DLY4f4HbJg8vQEETqyOlHfuh0tXUno22QSGmRE58qy8e4Qk0eEZSNF0Aw7V75erciqmpI3iYCWyOR7X92d7iN6isWluzOoqO4muZSI-Pc3gI326MPtT9T3VKoh7pWi8IA4y7hq99g7lGb3eQbCvk4uKQ6pN3QqOb17mcbeNvtT5YdNYWMd2MUIzQmEwIjBS6lZfMdQAkSNSbVlbzKcljHFXhr-PIn2g7rh1EWqYULjVIQYdLOUoMwUlWrw'
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
