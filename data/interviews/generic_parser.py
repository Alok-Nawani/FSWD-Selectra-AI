import re
import json
import os

def parse_file(file_path):
    print(f"Reading {file_path}")
    if not os.path.exists(file_path):
        return [], []
        
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    technical_questions = []
    hr_questions = []
    
    current_section = None # 'TECHNICAL' or 'HR'
    
    q_id_tech = 1
    q_id_hr = 1

    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Headers
        if "CORE TECHNICAL" in line:
            current_section = "TECHNICAL"
            continue
        if "HR" in line and ("Infosys" in line or "TCS" in line):
            current_section = "HR"
            continue
        if "Managerial Round" in line: # TCS specific
            current_section = "HR"
            continue
            
        # Skip if it is a main header line (redundant check but safe)
        if line.startswith("✅"):
            continue
            
        # Skip Subheaders (lines with emojis)
        # Using a simple check for any non-ascii character which usually denotes emoji here
        if any(ord(char) > 127 for char in line):
            # Likely a subheader like 🧠 Programming Fundamentals
            continue
            
        # Also skip lines starting with ( like (Conceptual + ...)
        if line.startswith("("):
            continue
            
        # Treat as Question
        # Extract keywords simply
        keywords = [w for w in line.split() if len(w) > 4]
        
        q_obj = {
            "id": 0,
            "question": line,
            "keywords": keywords,
            "ideal_answer": "Explain fully. Focus on key concepts."
        }
        
        if current_section == "TECHNICAL":
            q_obj["id"] = q_id_tech
            technical_questions.append(q_obj)
            q_id_tech += 1
        elif current_section == "HR":
            q_obj["id"] = q_id_hr
            hr_questions.append(q_obj)
            q_id_hr += 1
                
    return technical_questions, hr_questions

def process_company(company_name, input_path, output_dir):
    tech, hr = parse_file(input_path)
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    with open(os.path.join(output_dir, 'technical.json'), 'w') as f:
        json.dump(tech, f, indent=4)
        
    with open(os.path.join(output_dir, 'hr.json'), 'w') as f:
        json.dump(hr, f, indent=4)
        
    print(f"Processed {company_name}: {len(tech)} Technical, {len(hr)} HR questions.")

if __name__ == "__main__":
    base_dir = '/Users/alok/Documents/Selectra_AI/frontend/data/interviews'
    
    # Infosys
    infosys_in = os.path.join(base_dir, 'infosys/raw_input.txt')
    process_company('Infosys', infosys_in, os.path.join(base_dir, 'infosys'))
    
    # TCS
    tcs_in = os.path.join(base_dir, 'tcs/raw_input.txt')
    process_company('TCS', tcs_in, os.path.join(base_dir, 'tcs'))
