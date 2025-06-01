import React from "react";
import { TextField, Grid } from "@mui/material";




const TextInput = ({ label, value, size, onchange, type = "text", ...props }) => {
  return (
    <Grid item xs={size}>
    <TextField
      label={label}
      value={value}
      onChange={onchange}
      variant="outlined"
      size="small"
      type={type}
      fullWidth
      {...props}
      />
      </Grid>
  );
};

export default TextInput;
