#!/bin/bash

# Configuration
BASE_URL="https://ivy-shadow-druid.sandshrew.io"
ENDPOINT="/v2/lasereyes"
HOST_HEADER="mainnet.sandshrew.io"
TEST_ADDRESS="bc1pcmd4q9s5qat47ljknwamxsuz9p20zskln43jw45v38wq2clhs5tsscjqp5"
MAX_DISPLAY_LINES=10
# Generate timestamp for log files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULT_FILE="jsonrpc_test_${TIMESTAMP}.log"
HEALTH_REPORT_FILE="health_report_${TIMESTAMP}.log"

# Initialize health report data
declare -A namespace_status
declare -A namespace_response_time

# Function to make a JSON-RPC request with no parameters
function make_no_param_request() {
    local method=$1
    local id=${2:-1}
    local namespace=$(echo "$method" | cut -d '_' -f 1)
    
    echo "Making request for method: $method"
    
    # Record start time
    local start_time=$(date +%s.%N)
    
    # Make the request and save full response to result file
    local response=$(curl -s -X POST "$BASE_URL$ENDPOINT" \
        -H "Host: $HOST_HEADER" \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"$method\",\"params\":[]}")
    
    # Record end time and calculate duration
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    # Save full response to result file
    echo "Making request for method: $method" >> "$RESULT_FILE"
    echo "$response" | jq . >> "$RESULT_FILE"
    echo -e "\n" >> "$RESULT_FILE"
    
    # Check if response contains error
    if echo "$response" | jq -e '.error' > /dev/null; then
        namespace_status["$namespace"]="ERROR"
        echo -e "ERROR: $(echo "$response" | jq -c '.error')"
    else
        namespace_status["$namespace"]="OK"
        
        # Display truncated response to stdout
        echo "$response" | jq . | {
            # Count lines
            lines=$(wc -l)
            if [ "$lines" -gt "$MAX_DISPLAY_LINES" ]; then
                head -n $((MAX_DISPLAY_LINES/2))
                echo "... [truncated $(($lines - MAX_DISPLAY_LINES)) lines] ..."
                tail -n $((MAX_DISPLAY_LINES/2))
            else
                cat
            fi
        }
    fi
    
    # Store response time
    namespace_response_time["$namespace"]=$duration
    
    echo -e "\n"
}

# Function to make a JSON-RPC request with an address parameter
function make_address_request() {
    local method=$1
    local address=$2
    local id=${3:-1}
    local namespace=$(echo "$method" | cut -d '_' -f 1)
    
    echo "Making request for method: $method with address: $address"
    
    # Record start time
    local start_time=$(date +%s.%N)
    
    # Make the request and save full response to result file
    local response=$(curl -s -X POST "$BASE_URL$ENDPOINT" \
        -H "Host: $HOST_HEADER" \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"$method\",\"params\":[\"$address\"]}")
    
    # Record end time and calculate duration
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    # Save full response to result file
    echo "Making request for method: $method with address: $address" >> "$RESULT_FILE"
    echo "$response" | jq . >> "$RESULT_FILE"
    echo -e "\n" >> "$RESULT_FILE"
    
    # Check if response contains error
    if echo "$response" | jq -e '.error' > /dev/null; then
        namespace_status["$namespace"]="ERROR"
        echo -e "ERROR: $(echo "$response" | jq -c '.error')"
    else
        namespace_status["$namespace"]="OK"
        
        # Display truncated response to stdout
        echo "$response" | jq . | {
            # Count lines
            lines=$(wc -l)
            if [ "$lines" -gt "$MAX_DISPLAY_LINES" ]; then
                head -n $((MAX_DISPLAY_LINES/2))
                echo "... [truncated $(($lines - MAX_DISPLAY_LINES)) lines] ..."
                tail -n $((MAX_DISPLAY_LINES/2))
            else
                cat
            fi
        }
    fi
    
    # Store response time
    namespace_response_time["$namespace"]=$duration
    
    echo -e "\n"
}

# Function to make a JSON-RPC request with address object and "latest" parameters
function make_alkanes_request() {
    local method=$1
    local address=$2
    local id=${3:-1}
    local namespace=$(echo "$method" | cut -d '_' -f 1)
    
    echo "Making request for method: $method with address object and 'latest'"
    
    # Record start time
    local start_time=$(date +%s.%N)
    
    # Make the request and save full response to result file
    local response=$(curl -X POST "$BASE_URL$ENDPOINT" \
        -H "Host: $HOST_HEADER" \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"$method\",\"params\":[{\"address\":\"$address\",\"protocolTag\":\"1\"},\"latest\"]}")
    
    echo $response
    # Record end time and calculate duration
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    # Save full response to result file
    echo "Making request for method: $method with address object and 'latest'" >> "$RESULT_FILE"
    echo "$response" | jq . >> "$RESULT_FILE"
    echo -e "\n" >> "$RESULT_FILE"
    
    # Check if response contains error
    if echo "$response" | jq -e '.error' > /dev/null; then
        namespace_status["$namespace"]="ERROR"
        echo -e "ERROR: $(echo "$response" | jq -c '.error')"
    else
        namespace_status["$namespace"]="OK"
        
        # Display truncated response to stdout
        echo "$response" | jq . | {
            # Count lines
            lines=$(wc -l)
            if [ "$lines" -gt "$MAX_DISPLAY_LINES" ]; then
                head -n $((MAX_DISPLAY_LINES/2))
                echo "... [truncated $(($lines - MAX_DISPLAY_LINES)) lines] ..."
                tail -n $((MAX_DISPLAY_LINES/2))
            else
                cat
            fi
        }
    fi
    
    # Store response time
    namespace_response_time["$namespace"]=$duration
    
    echo -e "\n"
}

# Function to generate health report
function generate_health_report() {
    echo "===== JSON-RPC Health Report =====" > "$HEALTH_REPORT_FILE"
    echo "Generated: $(date)" >> "$HEALTH_REPORT_FILE"
    echo "Log file: $RESULT_FILE" >> "$HEALTH_REPORT_FILE"
    echo "=================================" >> "$HEALTH_REPORT_FILE"
    echo "" >> "$HEALTH_REPORT_FILE"
    
    echo "Namespace Status Summary:" >> "$HEALTH_REPORT_FILE"
    echo "-------------------------" >> "$HEALTH_REPORT_FILE"
    
    # Sort namespaces alphabetically
    for namespace in $(echo "${!namespace_status[@]}" | tr ' ' '\n' | sort); do
        status="${namespace_status[$namespace]}"
        response_time="${namespace_response_time[$namespace]}"
        
        # Format status with color indicators (for terminal display)
        if [ "$status" == "OK" ]; then
            status_display="✅ OK"
        else
            status_display="❌ ERROR"
        fi
        
        printf "%-20s | %-10s | %8.3f seconds\n" "$namespace" "$status_display" "$response_time" >> "$HEALTH_REPORT_FILE"
    done
    
    # Add alkanes load balancing consistency check if we have multiple alkanes calls
    if [[ "${namespace_status[alkanes]}" == "OK" ]]; then
        echo "" >> "$HEALTH_REPORT_FILE"
        echo "Alkanes Load Balancing Consistency:" >> "$HEALTH_REPORT_FILE"
        echo "--------------------------------" >> "$HEALTH_REPORT_FILE"
        
        # Count the number of alkanes requests in the log file
        alkanes_count=$(grep -c "Making request for method: alkanes_" "$RESULT_FILE")
        
        if [ "$alkanes_count" -gt 1 ]; then
            echo "Made $alkanes_count requests to alkanes namespace to verify load balancing consistency." >> "$HEALTH_REPORT_FILE"
            echo "Check the log file for detailed response comparison." >> "$HEALTH_REPORT_FILE"
        fi
    fi
    
    echo "" >> "$HEALTH_REPORT_FILE"
    echo "Full test results saved to: $RESULT_FILE" >> "$HEALTH_REPORT_FILE"
    
    # Display the health report
    cat "$HEALTH_REPORT_FILE"
}

# Main execution
echo "Starting JSON-RPC tests..."
# Clear previous result file
> "$RESULT_FILE"

# Test getblockcount (no params)
make_no_param_request "getblockcount"

# Test memshrew_build (no params)
make_no_param_request "memshrew_build"

# Test ord_address (with address param)
make_address_request "ord_address" "$TEST_ADDRESS"

# Test esplora_address::utxo (with address param)
make_address_request "esplora_address::utxo" "$TEST_ADDRESS"

# Test alkanes_protorunesbyaddress 5 times (with address and "latest" params)
echo "Testing alkanes_protorunesbyaddress 5 times to verify load balancing consistency..."
for i in {1..5}; do
    echo "alkanes_protorunesbyaddress test #$i"
    make_alkanes_request "alkanes_protorunesbyaddress" "$TEST_ADDRESS" "$i"
done

echo "All tests completed."
echo ""

# Generate and display health report
generate_health_report
