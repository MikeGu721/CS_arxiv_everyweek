import pandas as pd
import os

from_dir = 'xls_file'
to_dir = 'csv_file'


def convert_xls_to_csv(file_path, output_path):
    # 读取xls文件
    data = pd.read_excel(file_path)
    # 将数据写入csv文件
    data.to_csv(output_path, index=False)

dirrs = [from_dir]
start_index = 0
while(start_index<len(dirrs)):
    now_dir = dirrs[start_index]
    for dir_file in os.listdir(now_dir):
        from_dir_file = os.path.join(now_dir, dir_file)
        to_dir_file = os.path.join(now_dir, dir_file).replace(from_dir, to_dir).replace('.xls','.csv')

        if os.path.isdir(from_dir_file):
            os.makedirs(to_dir_file)
            dirrs.append(from_dir_file)

        else:
            if os.path.exists(from_dir_file.replace(from_dir, to_dir)): continue
            convert_xls_to_csv(from_dir_file, to_dir_file)
            print('Convert File: %s to File: %s'%(from_dir_file, to_dir_file))
    start_index += 1
