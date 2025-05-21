import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    
    // 创建一个 Promise 来处理 Python 脚本的执行
    const result = await new Promise<string>((resolve, reject) => {
      const safePrompt = JSON.stringify(prompt);
      const pythonProcess = spawn('python', ['-c', `
import time
from kittycad.api.ml import create_text_to_cad, get_text_to_cad_model_for_user
from kittycad.client import Client
from kittycad.models import (
    ApiCallStatus,
    Error,
    FileExportFormat,
    TextToCad,
    TextToCadCreateBody,
)

client = Client(token="api-fb04cd8b-6a3b-4eef-8866-33b25010bb0c")

response = create_text_to_cad.sync(
    client=client,
    output_format=FileExportFormat.STEP,
    body=TextToCadCreateBody(
        prompt=${safePrompt},
    ),
)

if isinstance(response, Error) or response is None:
    print("Error: " + str(response))
    exit(1)

result: TextToCad = response

while result.completed_at is None:
    time.sleep(5)
    response = get_text_to_cad_model_for_user.sync(
        client=client,
        id=result.id,
    )
    if isinstance(response, Error) or response is None:
        print("Error: " + str(response))
        exit(1)
    result = response

if result.status == ApiCallStatus.COMPLETED:
    if result.outputs is None:
        print("生成完成，但未返回任何文件。")
        exit(0)
    final_result = result.outputs["source.step"]
    print(final_result.decode("utf-8"))
      `]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(error || 'Python script execution failed');
        }
      });
    });

    // 自动写入本地 model.step 文件（每次覆盖）
    const stepFilePath = path.join(process.cwd(), 'model.step');
    fs.writeFileSync(stepFilePath, result as string, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      result: result 
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '写入文件错误' 
    });
  }
} 