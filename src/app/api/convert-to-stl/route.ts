import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function POST(request: Request) {
  try {
    // 获取请求中的STEP数据
    const { stepData } = await request.json();
    if (!stepData) {
      throw new Error('No STEP data provided');
    }

    // 使用项目根目录
    const stepFilePath = path.join(process.cwd(), 'model.step').replace(/\\/g, '/');
    const stlFilePath = path.join(process.cwd(), 'model.stl').replace(/\\/g, '/');

    // 保存STEP数据到文件
    fs.writeFileSync(stepFilePath, stepData, 'utf-8');

    console.log('Starting STEP to STL conversion...');
    console.log('Working directory:', process.cwd());
    console.log('STEP file path:', stepFilePath);
    console.log('STL file path:', stlFilePath);

    // 用 Python 脚本转换
    const result = await new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', ['-c', `
import sys
import os
from OCC.Core.STEPControl import STEPControl_Reader
from OCC.Core.IFSelect import IFSelect_RetDone
from OCC.Core.StlAPI import StlAPI_Writer
from OCC.Core.BRepBndLib import brepbndlib
from OCC.Core.Bnd import Bnd_Box
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh

print("Python script started")
print("Current working directory:", os.getcwd())

try:
    step_reader = STEPControl_Reader()
    status = step_reader.ReadFile(r"${stepFilePath}")
    
    if status == IFSelect_RetDone:
        print("STEP file read successfully")
        roots_nbr = step_reader.TransferRoots()
        print(f"Number of roots transferred: {roots_nbr}")
        shape = step_reader.OneShape()
        
        # 计算边界框
        bbox = Bnd_Box()
        brepbndlib.Add(shape, bbox)
        print(f"Shape bounds: X[{bbox.Get()[0]},{bbox.Get()[1]}] Y[{bbox.Get()[2]},{bbox.Get()[3]}] Z[{bbox.Get()[4]},{bbox.Get()[5]}]")
        
        # 进行网格化
        mesh = BRepMesh_IncrementalMesh(shape, 0.1)
        mesh.Perform()
        if mesh.IsDone():
            print("Mesh generation completed")
        else:
            print("Mesh generation failed")
            sys.exit(1)
        
        print("Converting to STL...")
        
        # 如果文件已存在，先删除
        if os.path.exists(r"${stlFilePath}"):
            os.remove(r"${stlFilePath}")
        
        # 写入STL文件
        stl_writer = StlAPI_Writer()
        result = stl_writer.Write(shape, r"${stlFilePath}")
        print(f"Write operation result: {result}")
        
        if result and os.path.exists(r"${stlFilePath}"):
            print("STL file successfully created at:", r"${stlFilePath}")
            print(f"File size: {os.path.getsize(r'${stlFilePath}')} bytes")
        else:
            print("Error: Failed to create STL file")
            sys.exit(1)
    else:
        print("Failed to read STEP file")
        sys.exit(1)
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
      `]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        const message = data.toString();
        output += message;
        console.log('Python stdout:', message);
      });

      pythonProcess.stderr.on('data', (data) => {
        const message = data.toString();
        error += message;
        console.error('Python stderr:', message);
      });

      pythonProcess.on('close', (code) => {
        console.log('Python process exited with code:', code);
        console.log('Final stdout:', output);
        console.log('Final stderr:', error);

        if (code === 0 || (error && error.includes('DeprecationWarning'))) {  // 允许带有警告的成功执行
          try {
            if (!fs.existsSync(stlFilePath)) {
              const errorMsg = 'STL file was not generated\nStdout: ' + output + '\nStderr: ' + error;
              console.error(errorMsg);
              reject(errorMsg);
              return;
            }

            const stlStats = fs.statSync(stlFilePath);
            if (stlStats.size === 0) {
              const errorMsg = 'Generated STL file is empty\nStdout: ' + output + '\nStderr: ' + error;
              console.error(errorMsg);
              reject(errorMsg);
              return;
            }

            const stlData = fs.readFileSync(stlFilePath, 'utf-8');
            console.log('STL file read successfully, size:', stlStats.size);
            resolve(stlData);
          } catch (err) {
            const errorMsg = `Failed to read STL file: ${err}\nStdout: ${output}\nStderr: ${error}`;
            console.error(errorMsg);
            reject(errorMsg);
          }
        } else {
          const errorMsg = error || output || 'Python script execution failed';
          console.error('Python script failed:', errorMsg);
          reject(errorMsg);
        }
      });
    });

    // 清理临时文件
    try { 
      fs.unlinkSync(stepFilePath);
      fs.unlinkSync(stlFilePath);
      console.log('Temporary files cleaned up');
    } catch (err) {
      console.warn('Failed to clean up temporary files:', err);
    }

    return NextResponse.json({ success: true, stlData: result });
  } catch (error) {
    console.error('Convert to STL error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 