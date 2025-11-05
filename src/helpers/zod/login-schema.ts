import { z } from "zod";

// Schema for traditional sign-in (email/username + password)
const TraditionalSignInSchema = z.object({
  email: z.string().email(),
  password: z.string().nonempty("Password is required"),
});


export default TraditionalSignInSchema;
